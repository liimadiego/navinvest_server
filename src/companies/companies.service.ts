import { Injectable } from '@nestjs/common';
import { CompanyEntity } from '../entities/companies.entity';
import { TickersEntity } from 'entities/tickers.entity';
import { DividendEntity } from 'entities/dividends.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

@Injectable()
export class CompaniesService {
    constructor(
        @InjectRepository(CompanyEntity)
        private readonly companyRepository: Repository<CompanyEntity>,
        @InjectModel(StockDataRecord.name)
        private stockDataRecordModel: Model<StockDataRecordDocument>,
        @InjectRepository(TickersEntity)
        private readonly tickersRepository: Repository<TickersEntity>,
        @InjectModel(HistoricalDividendYieldRecord.name)
        private historicalDividendYieldRecordModel: Model<HistoricalDividendYieldRecordDocument>,
        @InjectModel(HistoricalQuotesRecord.name)
        private historicalQuotesRecordModel: Model<HistoricalQuotesRecordDocument>,
        @InjectRepository(DividendEntity)
        private readonly dividendsRepository: Repository<DividendEntity>
    ) { }

    async findAll(): Promise<CompanyEntity[]> {
        return this.companyRepository.find();
    }

    async getCompanyByTicker(ticker: string): Promise<any> {
        const tickerData = await this.tickersRepository.findOne({
            where: { ticker },
            relations: ['company']
        });

        if (!tickerData) {
            throw new Error('Ticker not found');
        }

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

        const companyData = await this.stockDataRecordModel.findOne({ companyId });

        if (!companyData) {
            throw new Error('Company data not found');
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

        const currentNetSales = companyDataObj.incomes[0].net_sales || 0;
        const currentNetSales5Y = companyDataObj.incomes[4].net_sales || 0;

        const currentNetIncome = companyDataObj.incomes[0].net_income || 0;
        const currentNetIncome5Y = companyDataObj.incomes[4].net_income || 0;

        const cagrNetSales5Y = ((currentNetSales / currentNetSales5Y) ** (1 / 5)) - 1;
        const cagrNetIncome5Y = ((currentNetIncome / currentNetIncome5Y) ** (1 / 5)) - 1;

        if (historicalDividendYieldData) {
            historicalDividendYieldObj = historicalDividendYieldData.toObject();
        }

        const yearsAvailable = await this.getYearsCompanyData(companyId);

        const promises = yearsAvailable.map(async (item: any) => {
            const index = item.index;
            const year = item.year;
            const formattedStockData: any = {};

            Object.keys(companyDataObj).forEach((key) => {
                if (key === 'market_ratios' && Array.isArray(marketRatiosFiltered) && marketRatiosFiltered.length > 0) {
                    marketRatiosFiltered.sort((a: any, b: any) => {
                        return new Date(b.reference_date).getTime() - new Date(a.reference_date).getTime();
                    });
                    formattedStockData[key] = marketRatiosFiltered[index];
                } else if (Array.isArray(companyDataObj[key]) && companyDataObj[key].length > 0) {
                    formattedStockData[key] = companyDataObj[key][index];
                } else {
                    formattedStockData[key] = companyDataObj[key];
                }
            });

            const dividendsOfCompanyCurrentPeriod = await this.dividendsRepository
                .createQueryBuilder('dividends')
                .select('SUM(dividends.adj_amount)', 'totalDividends')
                .where('company_id = :companyId', { companyId })
                .andWhere('dividends.ticker = :ticker', { ticker })
                .andWhere('dividends.ex_date >= :startDate', { startDate: `${year}-01-01 00:00:00` })
                .andWhere('dividends.ex_date <= :endDate', { endDate: `${year}-12-31 23:59:59` })
                .getRawOne();

            const extraData = await this.buildOtherData(formattedStockData, dividendsOfCompanyCurrentPeriod);

            delete formattedStockData._id;
            delete formattedStockData.companyId;

            return {
                year,
                ...formattedStockData,
                dividendYieldLast12Months,
                others: {
                    ...extraData,
                }
            };
        });

        const allYearsReturn = await Promise.all(promises);

        return {
            companyMarketData: allYearsReturn,
            cagrNetSales5Y,
            cagrNetIncome5Y,
            tickerCompanyInfo: tickerData,
            historicalDividendYieldData: historicalDividendYieldObj,
            historicalQuotesData: historicalQuotesObj,
        };
    }

    async buildOtherData(formattedStockData: any, dividendsOfCompanyCurrentPeriod: any) {
        const {
            balance,
            cash_flows,
            incomes,
            market_ratios,
            ratios,
            shares,
        } = formattedStockData || {};

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

        if (ratios?.working_capital && market_ratios.price && shares.shares_total) {
            const aclPerShare = ratios.working_capital / shares.shares_total;
            p_acl = market_ratios.price / aclPerShare;
        }

        if (dividendsOfCompanyCurrentPeriod.totalDividends && incomes?.net_income && shares.shares_total) {
            payout = (dividendsOfCompanyCurrentPeriod?.totalDividends * shares.shares_total) / incomes?.net_income;
        }

        if (shares?.shares_total && market_ratios?.price && balance?.loans && balance?.long_term_loans && balance?.cash) {
            EV = (shares.shares_total * market_ratios.price) + (balance.loans + balance.long_term_loans) - balance.cash;
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

        if (market_ratios?.price && EBIT && shares?.shares_total) {
            P_EBIT = market_ratios?.price / (EBIT / shares?.shares_total)
        }

        if (market_ratios?.price && EBITDA && shares?.shares_total) {
            P_EBITDA = market_ratios?.price / (EBITDA / shares?.shares_total)
        }

        const taxRate = incomes.taxes && incomes.profit_before_taxes ? Math.abs(incomes.taxes / incomes.profit_before_taxes) : null;
        const nopat = taxRate && EBIT ? EBIT * (1 - taxRate) : null;
        const capitalInvested = balance.assets && balance.cash ? balance.assets - balance.cash : null;
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
            ROIC
        };
    }

    async getYearsCompanyData(companyId: string): Promise<any> {
        const companyData = await this.stockDataRecordModel.findOne({ companyId });

        if (!companyData) {
            throw new Error('Company data not found');
        }

        let companyDataObj: any = {};
        companyDataObj = companyData.toObject();

        const years = companyDataObj.incomes.map((item: any, index: number) => { return { year: item.period_end.split('-')[0], index } });

        return years;
    }
}
