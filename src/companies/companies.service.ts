import { HttpException, Injectable } from '@nestjs/common';
import { CompanyEntity } from '../entities/companies.entity';
import { TickersEntity } from 'entities/tickers.entity';
import { DividendEntity } from 'entities/dividends.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import {
    CompanyDataRecord,
    CompanyDataRecordDocument
} from '../schemas/company-data-record.schema';
import {
    StockDataRecord,
    StockDataRecordDocument
} from '../schemas/stock-data-record.schema';
import {
    HistoricalDividendYieldRecord,
    HistoricalDividendYieldRecordDocument
} from '../schemas/historical-dividend-yield.schema';
import {
    HistoricalQuotesRecord,
    HistoricalQuotesRecordDocument
} from '../schemas/historical-quotes.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { PromptsService } from '../utils/prompts.service';
import OpenAI from 'openai';
import { UsersService } from 'users/users.service';


const util = require('util');

@Injectable()
export class CompaniesService {
    private prompts = new PromptsService();
    private openai: OpenAI;

    constructor(
        @InjectRepository(CompanyEntity)
        private readonly companyRepository: Repository<CompanyEntity>,
        @InjectModel(CompanyDataRecord.name)
        private companyDataRecordModel: Model<CompanyDataRecordDocument>,
        @InjectRepository(TickersEntity)
        private readonly tickersRepository: Repository<TickersEntity>,
        @InjectModel(HistoricalDividendYieldRecord.name)
        private historicalDividendYieldRecordModel: Model<HistoricalDividendYieldRecordDocument>,
        @InjectModel(HistoricalQuotesRecord.name)
        private historicalQuotesRecordModel: Model<HistoricalQuotesRecordDocument>,
        @InjectModel(StockDataRecord.name)
        private stockDataRecordModel: Model<StockDataRecordDocument>,
        @InjectRepository(DividendEntity)
        private readonly dividendsRepository: Repository<DividendEntity>,
        private readonly usersService: UsersService,

    ) {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }


    getPrompt(name: string, sector_name: string, sector_average: any): string | null {
        return this.prompts.getPrompts()[name] || null;
    }

    async findAll(): Promise<CompanyEntity[]> {
        return this.companyRepository.find();
    }

    async getBRCompanyByTicker(ticker: string, comparing = false): Promise<any> {
        try {
            const tickerData = await this.tickersRepository.findOne({
                where: { ticker, company: Not(IsNull()) },
                relations: ['company']
            });

            if (!tickerData) {
                throw new Error('Ticker not found');
            }

            const company = tickerData.company;
            const sector = company.b3_sector;

            const companyId = tickerData.company.id;

            const totalDividendsLast12Months: any = await this.dividendsRepository
                .createQueryBuilder('dividends')
                .select('SUM(dividends.adj_amount)', 'totalDividendsLast12Months')
                .where('dividends.company.id = :companyId', { companyId })
                .andWhere('dividends.ex_date >= CURRENT_DATE - INTERVAL \'12 months\'')
                .andWhere('dividends.ticker = :ticker', { ticker })
                .getRawOne();

            const totalDividendsLast12MonthsValue = totalDividendsLast12Months.totalDividendsLast12Months || 0;
            let dividendYieldLast12Months = 0;

            if (totalDividendsLast12MonthsValue > 0) {
                dividendYieldLast12Months = (totalDividendsLast12MonthsValue / tickerData.current_price);
            }

            const companyData = await this.companyDataRecordModel.findOne({ companyId });

            if (!companyData) {
                throw new Error('Company data not found (companyId: ' + companyId + ')');
            }

            let companyDataObj: any = {};
            companyDataObj = companyData.toObject();

            const historicalDividendYieldData = await this.historicalDividendYieldRecordModel.findOne({ tickerId: tickerData.id });
            const historicalQuotesData = await this.historicalQuotesRecordModel.findOne({ tickerId: tickerData.id });
            let historicalQuotesObj: any = {};

            if (historicalQuotesData) {
                historicalQuotesObj = historicalQuotesData.toObject().quotes;
            }

            let historicalDividendYieldObj: any = {};

            const marketRatiosFiltered = companyDataObj.market_ratios.filter((item: any) => {
                return item.ticker === tickerData.ticker;
            });

            const currentNetSales = companyDataObj.incomes?.[0]?.net_sales || 0;
            const currentNetSales5Y = companyDataObj.incomes?.[4]?.net_sales || 0;

            const currentNetIncome = companyDataObj.incomes?.[0]?.net_income || 0;
            const currentNetIncome5Y = companyDataObj.incomes?.[4]?.net_income || 0;

            const cagrNetSales5Y = !currentNetSales5Y ? 0 : ((currentNetSales / currentNetSales5Y) ** (1 / 5)) - 1;
            const cagrNetIncome5Y = !currentNetIncome5Y ? 0 : ((currentNetIncome / currentNetIncome5Y) ** (1 / 5)) - 1;

            if (historicalDividendYieldData) {
                historicalDividendYieldObj = historicalDividendYieldData.toObject();
            }

            const yearsAvailable = await this.getYearsCompanyData(companyId);

            const promises = yearsAvailable.map(async (item: any) => {
                const index = item.index;
                const year = item.year;
                const formattedCompanyData: any = {};

                Object.keys(companyDataObj).forEach((key) => {
                    if (key === 'market_ratios' && Array.isArray(marketRatiosFiltered) && marketRatiosFiltered.length > 0) {
                        marketRatiosFiltered.sort((a: any, b: any) => {
                            return new Date(b.reference_date).getTime() - new Date(a.reference_date).getTime();
                        });
                        formattedCompanyData[key] = marketRatiosFiltered[index];
                    } else if (Array.isArray(companyDataObj[key]) && companyDataObj[key].length > 0) {
                        formattedCompanyData[key] = companyDataObj[key][index];
                    } else {
                        formattedCompanyData[key] = companyDataObj[key];
                    }
                });

                const dividendsOfCompanyCurrentPeriod = await this.dividendsRepository
                    .createQueryBuilder('dividends')
                    .select('SUM(dividends.amount)', 'totalDividends')
                    .where('company_id = :companyId', { companyId })
                    .andWhere('dividends.ticker = :ticker', { ticker })
                    .andWhere('dividends.ex_date >= :startDate', { startDate: `${year}-01-01 00:00:00` })
                    .andWhere('dividends.ex_date <= :endDate', { endDate: `${year}-12-31 23:59:59` })
                    .getRawOne();

                const extraData = await this.buildOtherData(formattedCompanyData, dividendsOfCompanyCurrentPeriod);

                delete formattedCompanyData._id;
                delete formattedCompanyData.companyId;

                return {
                    year,
                    ...formattedCompanyData,
                    dividendYieldLast12Months,
                    others: {
                        ...extraData,
                    }
                };
            });

            const allYearsReturn = await Promise.all(promises);

            return {
                current_price: tickerData.current_price,
                companyMarketData: comparing ? allYearsReturn[0] : allYearsReturn,
                sector,
                cagrNetSales5Y,
                cagrNetIncome5Y,
                tickerCompanyInfo: tickerData,
                historicalDividendYieldData: comparing ? null : historicalDividendYieldObj,
                historicalQuotesData: comparing ? null : historicalQuotesObj,
            };
        } catch (error) {
            console.error('Error in getBRCompanyByTicker:', error);
            throw new Error(error.message || 'An error occurred while fetching company data');
        }
    }

    async getUSCompanyByTicker(ticker: string, comparing = false): Promise<any> {
        try {
            const tickerData = await this.tickersRepository.findOne({
                where: { ticker, stock: Not(IsNull()) },
                relations: ['stock']
            });

            if (!tickerData) {
                throw new Error('Ticker not found');
            }

            if (!tickerData.stock) {
                throw new Error('Stock data not found for the ticker');
            }

            const sector = tickerData.stock.sector;
            const stockId = tickerData.stock.id;

            const totalDividendsLast12Months: any = await this.dividendsRepository
                .createQueryBuilder('dividends')
                .select('SUM(dividends.amount)', 'totalDividendsLast12Months')
                .where('dividends.stock.id = :stockId', { stockId })
                .andWhere('dividends.ex_date >= CURRENT_DATE - INTERVAL \'12 months\'')
                .andWhere('dividends.ticker = :ticker', { ticker })
                .getRawOne();

            const totalDividendsLast12MonthsValue = totalDividendsLast12Months.totalDividendsLast12Months || 0;
            let dividendYieldLast12Months = 0;

            if (totalDividendsLast12MonthsValue > 0) {
                dividendYieldLast12Months = (totalDividendsLast12MonthsValue / tickerData.current_price);
            }

            const companyData = await this.stockDataRecordModel.findOne({ stockId });

            if (!companyData) {
                throw new Error('Company data not found (stockId: ' + stockId + ')');
            }

            let companyDataObj: any = {};
            companyDataObj = companyData.toObject();

            const historicalQuotesData = await this.historicalQuotesRecordModel.findOne({ tickerId: tickerData.id });
            let historicalQuotesObj: any = {};

            if (historicalQuotesData) {
                historicalQuotesObj = historicalQuotesData.toObject().quotes;
            }

            const yearsAvailable = await this.getYearsCompanyData(stockId, true);

            const promises = yearsAvailable.map(async (item: any) => {
                const year = item.year;
                const formattedStockData: any = {};

                let stockData = companyDataObj.indicators.filter((item: any) => {
                    return item.year == year;
                });

                stockData = stockData.length > 0 ? stockData[0] : {};

                return {
                    year,
                    ...formattedStockData,
                    stockData
                };
            });

            const allYearsReturn = await Promise.all(promises);

            return {
                current_price: tickerData.current_price,
                companyMarketData: comparing ? allYearsReturn[0] : allYearsReturn,
                sector: this.camelize(sector),
                tickerCompanyInfo: tickerData,
                historicalQuotesData: comparing ? null : historicalQuotesObj,
            };
        } catch (error) {
            console.error('Error in getUSCompanyByTicker:', error);
            throw new Error(error.message || 'An error occurred while fetching US company data');
        }
    }

    camelize(str: string): string {
        return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
            return index === 0 ? word.toUpperCase() : word.toLowerCase();
        }).replace(/\s+/g, '');
    }

    async buildOtherData(formattedCompanyData: any, dividendsOfCompanyCurrentPeriod: any) {
        const {
            balance,
            cash_flows,
            incomes,
            market_ratios,
            ratios,
            shares,
        } = formattedCompanyData || {};

        let totalShares = null
        let EV = null;
        let EBIT = incomes.ebit || null;
        let EBITDA = null;
        let EV_EBIT = null; // valor da empresa / EBIT
        let EV_EBITDA = null; // valor da empresa / EBITDA
        let P_EBIT = null; // preço / EBIT
        let P_EBITDA = null; // preço / EBIT
        const netDebt = ratios.net_debt; //divida líquida
        let earnings_per_share = null; // lucro por ação
        let dividend_per_share = null; // dividendos por ação
        let payout = null; // payout
        let p_acl = null; // preço / capital de giro
        const netDebtEquity = balance.equity ? netDebt / balance.equity : null;
        const netDebtEBITDA = ratios.ebitda ? netDebt / ratios.ebitda : null;
        const netDebtEBIT = incomes.ebit ? netDebt / incomes.ebit : null;
        const grossDebtEquity = balance.equity ? ratios.gross_debt / balance.equity : null;
        const current_liquidity = ratios?.current_liquidity;

        if (balance?.assets && market_ratios?.assets_per_share) {
            totalShares = balance.assets / market_ratios.assets_per_share;
        }

        if (ratios?.working_capital && market_ratios?.price && totalShares) {
            const aclPerShare = ratios.working_capital / totalShares;
            p_acl = market_ratios.price / aclPerShare;
        }

        if (dividendsOfCompanyCurrentPeriod?.totalDividends && incomes?.net_income && totalShares) {
            payout = (dividendsOfCompanyCurrentPeriod?.totalDividends * totalShares) / incomes?.net_income;
        }

        if (totalShares && market_ratios?.price && balance?.loans && balance?.long_term_loans && balance?.cash) {
            EV = (totalShares * market_ratios.price) + (balance.loans + balance.long_term_loans) - balance.cash;
        }

        if (EBIT && cash_flows?.depreciation_and_amortization) {
            EBITDA = EBIT + cash_flows.depreciation_and_amortization;
        }

        if (EBIT && EV) {
            EV_EBIT = EV / EBIT;
        }

        if (EBITDA && EV) {
            EV_EBITDA = EV / EBITDA;
        }

        if (market_ratios?.price && EBIT && totalShares) {
            P_EBIT = market_ratios?.price / (EBIT / totalShares)
        }

        if (market_ratios?.price && EBITDA && totalShares) {
            P_EBITDA = market_ratios?.price / (EBITDA / totalShares)
        }

        const taxRate = incomes?.taxes && incomes?.profit_before_taxes ? Math.abs(incomes.taxes / incomes.profit_before_taxes) : null;
        const nopat = taxRate && EBIT ? EBIT * (1 - taxRate) : null;
        const capitalInvested = balance?.assets && balance.cash ? balance.assets - balance.cash : null;
        const ROIC = capitalInvested && nopat ? (capitalInvested > 0 ? nopat / capitalInvested : null) : null;

        return {
            EV,
            EBIT,
            EBITDA,
            EV_EBIT,
            EV_EBITDA,
            P_EBIT,
            P_EBITDA,
            netDebt,
            netDebtEBITDA,
            netDebtEBIT,
            netDebtEquity,
            earnings_per_share: shares?.earnings_per_share || null,
            dividend_per_share: shares?.dividend_per_share || null,
            payout: payout || null,
            p_acl: p_acl || null,
            grossDebtEquity,
            current_liquidity,
            ROIC,
            totalShares
        };
    }

    async getYearsCompanyData(companyId: string, usData: boolean = false): Promise<any> {
        const companyData = !usData ? await this.companyDataRecordModel.findOne({ companyId }) : await this.stockDataRecordModel.findOne({ stockId: companyId });

        if (!companyData) {
            throw new Error('Company data not found (companyId: ' + companyId + ', usData: ' + usData + ')');
        }

        let companyDataObj: any = {};
        companyDataObj = companyData.toObject();

        if (usData) {
            return companyDataObj.indicators.map((item: any, index: number) => { return { year: item.year, index } });
        } else {
            return companyDataObj.incomes.map((item: any, index: number) => { return { year: item.period_end.split('-')[0], index } });
        }
    }

    async compareCompanies(tickers: string[]): Promise<any> {
        try {
            const companies = [];
            let companiesFiltered = {};

            for (const ticker of tickers) {
                const company = await this.getBRCompanyByTicker(ticker, true);
                companies.push(company);
            }

            const companiesFormatted = companies.reduce((acc: any, company: any) => {
                const ticker = company.tickerCompanyInfo.ticker;
                acc[ticker] = {
                    ...company.companyMarketData,
                    ...company.others,
                    historicalDividendYieldData: company.historicalDividendYieldData,
                    historicalQuotesData: company.historicalQuotesData,
                    sector: company.sector,
                    current_price: company.current_price,
                };

                return acc;
            }, {});

            for (const ticker of tickers) {
                // First, collect all comparable values in temporary objects
                const priceEarningsValues = {};
                const priceToBookValues = {};
                const priceToSalesValues = {};
                const priceToAssetsValues = {};
                const priceToCashFlowValues = {};
                const evEbitValues = {};
                const evEbitdaValues = {};
                const pEbitValues = {};
                const pEbitdaValues = {};
                const roeValues = {};
                const roaValues = {};
                const roicValues = {};
                const lpaValues = {};
                const grossMarginValues = {};
                const ebitMarginValues = {};
                const ebitdaMarginValues = {};
                const netMarginValues = {};
                const netDebtValues = {};
                const netDebtEquityValues = {};
                const netDebtEbitdaValues = {};
                const grossDebtEquityValues = {};
                const currentLiquidityValues = {};
                const quickLiquidityValues = {};
                const cashLiquidityValues = {};
                const workingCapitalValues = {};
                const netSalesValues = {};
                const netIncomeValues = {};
                const ebitValues = {};
                const ebitdaValues = {};
                const dividendYieldValues = {};
                const payoutValues = {};
                const assetsValues = {};
                const equityValues = {};

                // Collect values for all tickers
                for (const ticker of tickers) {
                    priceEarningsValues[ticker] = companiesFormatted[ticker].market_ratios?.price_earnings;
                    priceToBookValues[ticker] = companiesFormatted[ticker].market_ratios?.price_to_book;
                    priceToSalesValues[ticker] = companiesFormatted[ticker].market_ratios?.price_to_sales;
                    priceToAssetsValues[ticker] = companiesFormatted[ticker].market_ratios?.price_to_assets;
                    priceToCashFlowValues[ticker] = companiesFormatted[ticker].market_ratios?.price_to_cash_flow;
                    evEbitValues[ticker] = companiesFormatted[ticker].others?.EV_EBIT;
                    evEbitdaValues[ticker] = companiesFormatted[ticker].others?.EV_EBITDA;
                    pEbitValues[ticker] = companiesFormatted[ticker].others?.P_EBIT;
                    pEbitdaValues[ticker] = companiesFormatted[ticker].others?.P_EBITDA;
                    roeValues[ticker] = companiesFormatted[ticker].ratios?.return_on_equity;
                    roaValues[ticker] = companiesFormatted[ticker].ratios?.return_on_assets;
                    roicValues[ticker] = companiesFormatted[ticker].others?.ROIC;
                    lpaValues[ticker] = companiesFormatted[ticker].market_ratios?.earnings_per_share;
                    grossMarginValues[ticker] = companiesFormatted[ticker].ratios?.gross_margin;
                    ebitMarginValues[ticker] = companiesFormatted[ticker].ratios?.ebit_margin;
                    ebitdaMarginValues[ticker] = companiesFormatted[ticker].ratios?.ebitda_margin;
                    netMarginValues[ticker] = companiesFormatted[ticker].ratios?.net_margin;
                    netDebtValues[ticker] = companiesFormatted[ticker].others?.netDebt;
                    netDebtEquityValues[ticker] = companiesFormatted[ticker].others?.netDebtEquity;
                    netDebtEbitdaValues[ticker] = companiesFormatted[ticker].others?.netDebtEBITDA;
                    grossDebtEquityValues[ticker] = companiesFormatted[ticker].others?.grossDebtEquity;
                    currentLiquidityValues[ticker] = companiesFormatted[ticker].ratios?.current_liquidity;
                    quickLiquidityValues[ticker] = companiesFormatted[ticker].ratios?.quick_liquidity;
                    cashLiquidityValues[ticker] = companiesFormatted[ticker].ratios?.cash_liquidity;
                    workingCapitalValues[ticker] = companiesFormatted[ticker].ratios?.working_capital;
                    netSalesValues[ticker] = companiesFormatted[ticker].incomes?.net_sales;
                    netIncomeValues[ticker] = companiesFormatted[ticker].incomes?.net_income;
                    ebitValues[ticker] = companiesFormatted[ticker].incomes?.ebit;
                    ebitdaValues[ticker] = companiesFormatted[ticker].ratios?.ebitda;
                    dividendYieldValues[ticker] = companiesFormatted[ticker].dividendYieldLast12Months;
                    payoutValues[ticker] = companiesFormatted[ticker].others?.payout;
                    assetsValues[ticker] = companiesFormatted[ticker].balance?.assets;
                    equityValues[ticker] = companiesFormatted[ticker].balance?.equity;
                }

                // Now for each ticker, determine winners
                for (const ticker of tickers) {
                    //Informações Gerais
                    const price = companiesFormatted[ticker].current_price;
                    const sector = companiesFormatted[ticker].sector;

                    //Valuation
                    const priceEarnings = companiesFormatted[ticker].market_ratios?.price_earnings;
                    const priceToBook = companiesFormatted[ticker].market_ratios?.price_to_book;
                    const priceToSales = companiesFormatted[ticker].market_ratios?.price_to_sales;
                    const priceToAssets = companiesFormatted[ticker].market_ratios?.price_to_assets;
                    const priceToCashFlow = companiesFormatted[ticker].market_ratios?.price_to_cash_flow;
                    const evEbit = companiesFormatted[ticker].others?.EV_EBIT;
                    const evEbitda = companiesFormatted[ticker].others?.EV_EBITDA;
                    const pEbit = companiesFormatted[ticker].others?.P_EBIT;
                    const pEbitda = companiesFormatted[ticker].others?.P_EBITDA;

                    //Rentabilidade
                    const returnOnEquity = companiesFormatted[ticker].ratios?.return_on_equity; // ROE
                    const returnOnAssets = companiesFormatted[ticker].ratios?.return_on_assets; // ROA
                    const roic = companiesFormatted[ticker].others?.ROIC;
                    const earningsPerShare = companiesFormatted[ticker].market_ratios?.earnings_per_share;

                    //Margens
                    const grossMargin = companiesFormatted[ticker].ratios?.gross_margin;
                    const ebitMargin = companiesFormatted[ticker].ratios?.ebit_margin;
                    const ebitdaMargin = companiesFormatted[ticker].ratios?.ebitda_margin;
                    const netMargin = companiesFormatted[ticker].ratios?.net_margin;

                    //Endividamento
                    const netDebt = companiesFormatted[ticker].others?.netDebt;
                    const netDebtEquity = companiesFormatted[ticker].others?.netDebtEquity;
                    const netDebtEbitda = companiesFormatted[ticker].others?.netDebtEBITDA;
                    const grossDebtEquity = companiesFormatted[ticker].others?.grossDebtEquity;
                    const totalDebt = companiesFormatted[ticker].ratios?.total_debt;

                    //Liquidez e Capital de Giro
                    const currentLiquidity = companiesFormatted[ticker].ratios?.current_liquidity;
                    const quickLiquidity = companiesFormatted[ticker].ratios?.quick_liquidity;
                    const cashLiquidity = companiesFormatted[ticker].ratios?.cash_liquidity;
                    const workingCapital = companiesFormatted[ticker].ratios?.working_capital;

                    //Receita e Lucro
                    const netSales = companiesFormatted[ticker].incomes?.net_sales;
                    const netIncome = companiesFormatted[ticker].incomes?.net_income;
                    const ebit = companiesFormatted[ticker].incomes?.ebit;
                    const ebitda = companiesFormatted[ticker].ratios?.ebitda;

                    //Outros Indicadores
                    const dividendYield = companiesFormatted[ticker].dividendYieldLast12Months;
                    const payout = companiesFormatted[ticker].others?.payout;
                    const assets = companiesFormatted[ticker].balance?.assets;
                    const equity = companiesFormatted[ticker].balance?.equity;

                    // Function to determine if a value is the winner (smallest) among valid values
                    const isSmallestWinner = (valuesObj: any, currentValue: any) => {
                        if (Object.values(valuesObj).some(v => v === null)) return null;

                        if (currentValue === null || currentValue === undefined) return null;
                        const validValues = Object.values(valuesObj).filter(v => v !== null && v !== undefined) as number[];
                        if (validValues.length === 0) return null;
                        return currentValue === Math.min(...validValues);
                    };

                    // Function to determine if a value is the winner (largest) among valid values
                    const isLargestWinner = (valuesObj: any, currentValue: any) => {
                        if (Object.values(valuesObj).some(v => v === null)) return null;

                        if (currentValue === null || currentValue === undefined) return null;
                        const validValues = Object.values(valuesObj).filter(v => v !== null && v !== undefined) as number[];
                        if (validValues.length === 0) return null;
                        return currentValue === Math.max(...validValues);
                    };

                    companiesFiltered[ticker] = {
                        generalInfo: {
                            ticker: { value: ticker, translation: 'Ticker', tooltip: 'Código da ação na bolsa' },
                            price: { value: price ? this.fCurrency(price) : '-', translation: 'Preço', tooltip: 'Preço atual da ação' },
                            sector: { value: sector, translation: 'Setor', tooltip: 'Setor da empresa' },
                        },
                        valuation: {
                            priceEarnings: {
                                value: priceEarnings ? priceEarnings.toFixed(2) : '-',
                                translation: 'P/L',
                                tooltip: 'Preço da ação dividido pelo lucro por ação',
                                winner: isSmallestWinner(priceEarningsValues, priceEarnings)
                            },
                            priceToBook: {
                                value: priceToBook ? priceToBook.toFixed(2) : '-',
                                translation: 'P/VP',
                                tooltip: 'Preço da ação dividido pelo valor patrimonial por ação',
                                winner: isSmallestWinner(priceToBookValues, priceToBook)
                            },
                            priceToSales: {
                                value: priceToSales ? priceToSales.toFixed(2) : '-',
                                translation: 'P/Receita',
                                tooltip: 'Preço da ação dividido pela receita por ação',
                                winner: isSmallestWinner(priceToSalesValues, priceToSales)
                            },
                            priceToAssets: {
                                value: priceToAssets ? priceToAssets.toFixed(2) : '-',
                                translation: 'P/Ativo',
                                tooltip: 'Preço da ação dividido pelos ativos por ação',
                                winner: isSmallestWinner(priceToAssetsValues, priceToAssets)
                            },
                            priceToCashFlow: {
                                value: priceToCashFlow ? priceToCashFlow.toFixed(2) : '-',
                                translation: 'P/FCO',
                                tooltip: 'Preço da ação dividido pelo fluxo de caixa operacional por ação',
                                winner: isSmallestWinner(priceToCashFlowValues, priceToCashFlow)
                            },
                            evEbit: {
                                value: evEbit ? evEbit.toFixed(2) : '-',
                                translation: 'EV/EBIT',
                                tooltip: 'Valor da empresa dividido pelo EBIT',
                                winner: isSmallestWinner(evEbitValues, evEbit)
                            },
                            evEbitda: {
                                value: evEbitda ? evEbitda.toFixed(2) : '-',
                                translation: 'EV/EBITDA',
                                tooltip: 'Valor da empresa dividido pelo EBITDA',
                                winner: isSmallestWinner(evEbitdaValues, evEbitda)
                            },
                            pEbit: {
                                value: pEbit ? pEbit.toFixed(2) : '-',
                                translation: 'P/EBIT',
                                tooltip: 'Preço da ação dividido pelo EBIT por ação',
                                winner: isSmallestWinner(pEbitValues, pEbit)
                            },
                            pEbitda: {
                                value: pEbitda ? pEbitda.toFixed(2) : '-',
                                translation: 'P/EBITDA',
                                tooltip: 'Preço da ação dividido pelo EBITDA por ação',
                                winner: isSmallestWinner(pEbitdaValues, pEbitda)
                            }
                        },
                        profitability: {
                            returnOnEquity: {
                                value: returnOnEquity ? `${(returnOnEquity).toFixed(2)}%` : '-',
                                translation: 'ROE',
                                tooltip: 'Retorno sobre o patrimônio líquido',
                                winner: isLargestWinner(roeValues, returnOnEquity)
                            },
                            returnOnAssets: {
                                value: returnOnAssets ? `${(returnOnAssets * 100).toFixed(2)}%` : '-',
                                translation: 'ROA',
                                tooltip: 'Retorno sobre os ativos',
                                winner: isLargestWinner(roaValues, returnOnAssets)
                            },
                            roic: {
                                value: roic ? `${(roic * 100).toFixed(2)}%` : '-',
                                translation: 'ROIC',
                                tooltip: 'Retorno sobre o capital investido',
                                winner: isLargestWinner(roicValues, roic)
                            },
                            earningsPerShare: {
                                value: earningsPerShare ? this.fCurrency(earningsPerShare) : '-',
                                translation: 'LPA',
                                tooltip: 'Lucro por ação',
                                winner: isLargestWinner(lpaValues, earningsPerShare)
                            }
                        },
                        margins: {
                            grossMargin: {
                                value: grossMargin ? `${(grossMargin).toFixed(2)}%` : '-',
                                translation: 'Margem Bruta',
                                tooltip: 'Lucro bruto dividido pela receita líquida',
                                winner: isLargestWinner(grossMarginValues, grossMargin)
                            },
                            ebitMargin: {
                                value: ebitMargin ? `${(ebitMargin).toFixed(2)}%` : '-',
                                translation: 'Margem EBIT',
                                tooltip: 'EBIT dividido pela receita líquida',
                                winner: isLargestWinner(ebitMarginValues, ebitMargin)
                            },
                            ebitdaMargin: {
                                value: ebitdaMargin ? `${(ebitdaMargin).toFixed(2)}%` : '-',
                                translation: 'Margem EBITDA',
                                tooltip: 'EBITDA dividido pela receita líquida',
                                winner: isLargestWinner(ebitdaMarginValues, ebitdaMargin)
                            },
                            netMargin: {
                                value: netMargin ? `${(netMargin).toFixed(2)}%` : '-',
                                translation: 'Margem Líquida',
                                tooltip: 'Lucro líquido dividido pela receita líquida',
                                winner: isLargestWinner(netMarginValues, netMargin)
                            }
                        },
                        debt: {
                            netDebt: {
                                value: netDebt ? this.fShortenNumberToString(netDebt) : '-',
                                translation: 'Dívida Líquida',
                                tooltip: 'Dívida total menos caixa e equivalentes',
                                winner: isSmallestWinner(netDebtValues, netDebt)
                            },
                            netDebtEquity: {
                                value: netDebtEquity ? netDebtEquity.toFixed(2) : '-',
                                translation: 'Dívida Líq./PL',
                                tooltip: 'Dívida líquida dividida pelo patrimônio líquido',
                                winner: isSmallestWinner(netDebtEquityValues, netDebtEquity)
                            },
                            netDebtEbitda: {
                                value: netDebtEbitda ? netDebtEbitda.toFixed(2) : '-',
                                translation: 'Dívida Líq./EBITDA',
                                tooltip: 'Dívida líquida dividida pelo EBITDA',
                                winner: isSmallestWinner(netDebtEbitdaValues, netDebtEbitda)
                            },
                            grossDebtEquity: {
                                value: grossDebtEquity ? grossDebtEquity.toFixed(2) : '-',
                                translation: 'Dívida Bruta/PL',
                                tooltip: 'Dívida bruta dividida pelo patrimônio líquido',
                                winner: isSmallestWinner(grossDebtEquityValues, grossDebtEquity)
                            },
                        },
                        liquidity: {
                            currentLiquidity: {
                                value: currentLiquidity ? currentLiquidity.toFixed(2) : '-',
                                translation: 'Liquidez Corrente',
                                tooltip: 'Ativos circulantes divididos pelos passivos circulantes',
                                winner: isLargestWinner(currentLiquidityValues, currentLiquidity)
                            },
                            quickLiquidity: {
                                value: quickLiquidity ? quickLiquidity.toFixed(2) : '-',
                                translation: 'Liquidez Seca',
                                tooltip: 'Ativos circulantes menos estoques, divididos pelos passivos circulantes',
                                winner: isLargestWinner(quickLiquidityValues, quickLiquidity)
                            },
                            cashLiquidity: {
                                value: cashLiquidity ? cashLiquidity.toFixed(2) : '-',
                                translation: 'Liquidez Imediata',
                                tooltip: 'Disponibilidades divididas pelos passivos circulantes',
                                winner: isLargestWinner(cashLiquidityValues, cashLiquidity)
                            },
                            workingCapital: {
                                value: workingCapital ? this.fShortenNumberToString(workingCapital) : '-',
                                translation: 'Capital de Giro',
                                tooltip: 'Ativos circulantes menos passivos circulantes',
                                winner: isLargestWinner(workingCapitalValues, workingCapital)
                            }
                        },
                        revenueAndProfit: {
                            netSales: {
                                value: netSales ? this.fShortenNumberToString(netSales) : '-',
                                translation: 'Receita Líquida',
                                tooltip: 'Receita total após deduções',
                                winner: isLargestWinner(netSalesValues, netSales)
                            },
                            netIncome: {
                                value: netIncome ? this.fShortenNumberToString(netIncome) : '-',
                                translation: 'Lucro Líquido',
                                tooltip: 'Lucro após todas as despesas e impostos',
                                winner: isLargestWinner(netIncomeValues, netIncome)
                            },
                            ebit: {
                                value: ebit ? this.fShortenNumberToString(ebit) : '-',
                                translation: 'EBIT',
                                tooltip: 'Lucro antes de juros e impostos',
                                winner: isLargestWinner(ebitValues, ebit)
                            },
                            ebitda: {
                                value: ebitda ? this.fShortenNumberToString(ebitda) : '-',
                                translation: 'EBITDA',
                                tooltip: 'Lucro antes de juros, impostos, depreciação e amortização',
                                winner: isLargestWinner(ebitdaValues, ebitda)
                            }
                        },
                        otherIndicators: {
                            dividendYield: {
                                value: dividendYield ? `${(dividendYield * 100).toFixed(2)}%` : '-',
                                translation: 'Dividend Yield',
                                tooltip: 'Rendimento de dividendos em relação ao preço da ação',
                                winner: isLargestWinner(dividendYieldValues, dividendYield)
                            },
                            payout: {
                                value: payout ? `${(payout * 100).toFixed(2)}%` : '-',
                                translation: 'Payout',
                                tooltip: 'Percentual do lucro distribuído como dividendos',
                                winner: isLargestWinner(payoutValues, payout)
                            },
                            assets: {
                                value: assets ? this.fShortenNumberToString(assets) : '-',
                                translation: 'Ativos Totais',
                                tooltip: 'Soma de todos os ativos da empresa',
                                winner: isLargestWinner(assetsValues, assets)
                            },
                            equity: {
                                value: equity ? this.fShortenNumberToString(equity) : '-',
                                translation: 'Patrimônio Líquido',
                                tooltip: 'Valor líquido dos ativos após subtrair os passivos',
                                winner: isLargestWinner(equityValues, equity)
                            }
                        },
                    };
                }
            }

            return companiesFiltered;
        } catch (error) {
            console.error('Error in "compareCompanies()":', error);
            throw new Error(error.message || 'An error occurred at "compareCompanies()"');
        }

    }

    fCurrency(inputValue: number | string, currency = 'BRL') {
        const locale = currency === 'BRL'
            ? { code: 'pt-BR', currency: 'BRL' }
            : { code: 'en-US', currency: 'USD' };

        const number = Number(inputValue);
        if (isNaN(number)) return '';

        return new Intl.NumberFormat(locale.code, {
            style: 'currency',
            currency: locale.currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(number);
    }

    fShortenNumberToString(inputValue) {
        if (inputValue == null || Number.isNaN(inputValue)) return null;
        const number = Number(inputValue);
        if (number === null) return '';

        const units = ['K', 'M', 'B', 'T'];
        const baseValue = 1000;
        const isNegative = number < 0;
        const absNumber = Math.abs(number);

        if (absNumber < baseValue) return number.toString();

        const index = Math.floor(Math.log(absNumber) / Math.log(baseValue));
        const shortenedValue = (absNumber / baseValue ** index).toFixed(1).replace('.', ',');

        return isNegative
            ? `-${shortenedValue}${units[index - 1]}`
            : `${shortenedValue}${units[index - 1]}`;
    }

    processInput(inputValue: number | string) {
        if (inputValue == null || Number.isNaN(inputValue)) return null;
        return Number(inputValue);
    }

    async compareWithAI(companiesData: any, userId: string): Promise<any> {
        let canUseTokens = await this.usersService.canUseTokens(userId);

        if (!canUseTokens) {
            throw new HttpException('Limite de tokens excedido.', 429);
        }

        const response = await this.openai.chat.completions.create({
            model: process.env.OPEN_AI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: this.prompts.getPrompts()['compare_assets']
                },
                {
                    role: 'user',
                    content: JSON.stringify(companiesData),
                },
            ],
            max_tokens: 3000,
            temperature: 0.5,
        });

        await this.usersService.addTokens(userId, response.usage.total_tokens ? response.usage.total_tokens : 2500);

        return response.choices[0].message.content;
    }
}
