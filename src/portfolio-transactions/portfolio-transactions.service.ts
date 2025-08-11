import * as path from 'path';
import * as csv from 'csv-parser';
import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { TickersEntity } from 'entities/tickers.entity';
import { InvestmentPortfolioEntity } from '../entities/investment-portfolio.entity';
import { PortfolioTransactionEntity } from 'entities/portfolio-transaction.entity';
import { FixedIncomeDetailsEntity } from 'entities/fixed-income-details.entity';
import { EconomicIndexesEntity } from 'entities/economic-indexes.entity';
import { FinancialHolidaysEntity } from 'entities/financial-holidays.entity';
import { TreasuriesEntity } from 'entities/treasuries.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Between } from 'typeorm';
import { CreatePortfolioTransactionDto } from './dto/create-portfolio-transaction-dto';
import { LanguagesService } from 'utils/language.service';
import OpenAI from 'openai';
import { Multer } from 'multer';
import { PromptsService } from '../utils/prompts.service';
import { UsersService } from 'users/users.service';
import { FundsEntity } from 'entities/funds.entity';
import { HistoricalFundsQuotesRecord, HistoricalFundsQuotesRecordDocument } from '../schemas/historical-funds-quotes.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class PortfolioTransactionsService {
    private openai: OpenAI;
    private prompts = new PromptsService().getPrompts();

    constructor(
        @InjectRepository(InvestmentPortfolioEntity)
        private readonly investmentPortfolioRepository: Repository<InvestmentPortfolioEntity>,
        @InjectRepository(TickersEntity)
        private readonly tickerRepository: Repository<TickersEntity>,
        @InjectRepository(PortfolioTransactionEntity)
        private readonly portfolioTransactionRepository: Repository<PortfolioTransactionEntity>,
        private readonly languagesService: LanguagesService,
        @InjectRepository(FixedIncomeDetailsEntity)
        private readonly fixedIncomeDetailsRepository: Repository<FixedIncomeDetailsEntity>,
        @InjectRepository(EconomicIndexesEntity)
        private readonly economicIndexesRepository: Repository<EconomicIndexesEntity>,
        @InjectRepository(FinancialHolidaysEntity)
        private readonly financialHolidaysRepository: Repository<FinancialHolidaysEntity>,
        @InjectRepository(TreasuriesEntity)
        private readonly treasuriesRepository: Repository<TreasuriesEntity>,
        @InjectRepository(FundsEntity)
        private readonly fundsRepository: Repository<FundsEntity>,
        private readonly usersService: UsersService,
        @InjectModel(HistoricalFundsQuotesRecord.name)
        private historicalFundsQuotesRecordModel: Model<HistoricalFundsQuotesRecordDocument>,
    ) {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    async createTransactionFromWalletImportData(walletImportData: any, portfolioId: string): Promise<any> {
        const portfolioExists = await this.investmentPortfolioRepository.exists({ where: { id: portfolioId } });
        if (!portfolioExists) {
            throw new NotFoundException(`Portfolio with ID ${portfolioId} not found`);
        }

        const { fixed_income, variable_income, treasury } = walletImportData;
        const transactions = [];

        const fixedIncomeTransactions = fixed_income?.map((item: any) => {
            return {
                portfolio_id: portfolioId,
                asset_type: 'FIXED_INCOME',
                transaction_type: item.transaction_type,
                amount: item.amount,
                price_per_unit: item.amount,
                transaction_date: item.transaction_date,
                quantity: 1,
                issuer: item.issuer,
                investment_type: item.investment_type,
                indexation_type: item.indexation_type,
                expiration_date: item.expiration_date,
                indexer: item.indexer,
                currency: "BRL",
                indexer_rate: item.indexer_rate,
            };
        }) || [];

        const treasuryTransactions = await Promise.all((treasury || []).map(async (item: any) => {
            const treasuryTitle = await this.treasuriesRepository.findOne({
                where: [
                    { name: item.name, indexer: item.indexer },
                    { isin: item.isin }
                ]
            });

            if (!treasuryTitle) {
                throw new NotFoundException(`Título do Tesouro '${item.name}' com indexador '${item.indexer}' não encontrado`);
            }

            return {
                portfolio_id: portfolioId,
                asset_type: 'TREASURY',
                transaction_type: item.transaction_type,
                amount: item.amount,
                price_per_unit: item.price_per_unit || treasuryTitle.unit_price,
                transaction_date: item.transaction_date,
                quantity: item.quantity || 1,
                treasury_id: treasuryTitle.id,
            };
        }));

        const variableIncomeTransactions = await Promise.all((variable_income || []).map(async (item: any) => {
            const ticker = await this.tickerRepository.findOne({ where: { ticker: item.ticker } });
            if (!ticker) {
                throw new NotFoundException(`Ticker with name ${item.ticker} not found`);
            }
            const tickerId = ticker.id;

            return {
                portfolio_id: portfolioId,
                asset_type: ticker.asset_type.toUpperCase(),
                transaction_type: item.transaction_type,
                amount: item.amount,
                price_per_unit: item.price_per_unit,
                transaction_date: item.transaction_date,
                quantity: item.quantity,
                ticker_id: tickerId,
            };
        }));

        transactions.push(...fixedIncomeTransactions, ...variableIncomeTransactions, ...treasuryTransactions);

        await Promise.all(transactions.map(async (transaction) => {
            await this.createTransaction(transaction);
            return transaction;
        }));

        return {
            success: true,
            message: 'Transações criadas com sucesso'
        };
    }

    async createTransactionFromWalletImportDataB3(assetTradingList: any, portfolioId: string): Promise<any> {
        const portfolioExists = await this.investmentPortfolioRepository.exists({ where: { id: portfolioId } });
        if (!portfolioExists) {
            throw new NotFoundException(`Portfolio with ID ${portfolioId} not found`);
        }

        // 1. Collect all ticker names
        const tickerNames = [
            ...new Set(
                assetTradingList
                    .map((assetTrading: any) => assetTrading.assetTradingObjectCode || assetTrading.tickerSymbol)
                    .filter(Boolean)
            )
        ];

        // 2. Fetch all tickers in one query
        const tickers = await this.tickerRepository.find({
            where: tickerNames.map(name => ({ ticker: name })) as any[],
        });
        const tickerMap = new Map(tickers.map(t => [t.ticker, t]));

        // 3. Build transactions array
        const transactions = [];
        for (const assetTrading of assetTradingList) {
            const tickerName = assetTrading.assetTradingObjectCode || assetTrading.tickerSymbol;
            if (!tickerName) {
                console.log(`Failed to find ticker name for 'assetTrading':`, assetTrading, '\n ');
                throw new NotFoundException(`Failed to parse all B3 transactions.`);
            }
            
            const ticker = tickerMap.get(tickerName);
            if (!ticker) {
                throw new NotFoundException(`Ticker with name ${tickerName} not found`);
            }
            const tickerId = ticker.id;

            const transaction = {
                portfolio_id: portfolioId,
                asset_type: ticker.asset_type.toUpperCase(),
                transaction_type: assetTrading.side === "Compra" ? "BUY" : "SELL",
                amount: assetTrading.grossAmount,
                price_per_unit: assetTrading.priceValue,
                transaction_date: new Date(assetTrading.tradeDateTime+'-0300'),
                quantity: assetTrading.tradeQuantity,
                ticker_id: tickerId,
                adjustment_description: assetTrading._adjustmentDescription
            };

            transactions.push(transaction);
        }

        // 4. Bulk insert transactions
        try {
            await this.portfolioTransactionRepository.save(transactions);
            
        } catch (error) {
            console.error('[E] Importing B3 transaction:', error);
            throw new HttpException('Failed to import B3 transaction', 500);
        }

        return {
            success: true,
            message: 'Transações criadas com sucesso'
        };
    }

    async createTransaction(createDto: CreatePortfolioTransactionDto): Promise<any> {
        try {
            const portfolioExists = await this.investmentPortfolioRepository.exists({
                where: { id: createDto.portfolio_id }
            });

            if (!portfolioExists) {
                throw new NotFoundException(`Portfolio with ID ${createDto.portfolio_id} not found`);
            }

            if (createDto.ticker_id) {
                const tickerExists = await this.tickerRepository.exists({
                    where: { id: createDto.ticker_id }
                });

                if (!tickerExists) {
                    throw new NotFoundException(`Ticker with ID ${createDto.ticker_id} not found`);
                }
            }

            if (createDto.treasury_id) {
                const treasuryExists = await this.treasuriesRepository.exists({
                    where: { id: createDto.treasury_id }
                });

                if (!treasuryExists) {
                    throw new NotFoundException(`Treasury with ID ${createDto.treasury_id} not found`);
                }
            }

            if (createDto.fund_id) {
                const fundExists = await this.fundsRepository.exists({
                    where: { id: createDto.fund_id }
                });

                if (!fundExists) {
                    throw new NotFoundException(`Fund with ID ${createDto.fund_id} not found`);
                }
            }

            let fixedIncomeDetails = null;

            if (createDto.asset_type === 'FIXED_INCOME' && (
                !createDto.issuer ||
                !createDto.investment_type ||
                !createDto.indexation_type ||
                !createDto.expiration_date ||
                !createDto.indexer ||
                !createDto.currency ||
                !createDto.indexer_rate
            )) {
                throw new NotFoundException(`Missing required fields for fixed income transaction`);
            }

            if (createDto.asset_type === 'FIXED_INCOME') {
                fixedIncomeDetails = {
                    issuer: createDto.issuer,
                    investment_type: createDto.investment_type,
                    indexation_type: createDto.indexation_type,
                    expiration_date: createDto.expiration_date,
                    indexer: createDto.indexer,
                    currency: createDto.currency,
                    indexer_rate: createDto.indexer_rate,
                };
            }

            const transaction = this.portfolioTransactionRepository.create({
                portfolio: { id: createDto.portfolio_id },
                ticker: createDto.ticker_id ? { id: createDto.ticker_id } : null,
                treasury: createDto.treasury_id ? { id: createDto.treasury_id } : null,
                fund: createDto.fund_id ? { id: createDto.fund_id } : null,
                asset_type: createDto.asset_type,
                transaction_type: createDto.transaction_type,
                amount: createDto.amount,
                price_per_unit: createDto.price_per_unit || null,
                transaction_date: createDto.transaction_date || new Date(),
                quantity: createDto.quantity || 0,
                fixed_income_details: fixedIncomeDetails ? await this.fixedIncomeDetailsRepository.save(fixedIncomeDetails) : null,
            });

            return this.portfolioTransactionRepository.save(transaction);
        } catch (error) {
            console.error('Error creating transaction:', error);
            throw new HttpException('Failed to create transaction', 500);
        }
    }

    async editTransaction(data: any): Promise<any> {
        let transaction: any;

        if (data.asset_type === 'FIXED_INCOME') {
            transaction = await this.portfolioTransactionRepository.findOne({
                where: { id: data.id },
                relations: ['fixed_income_details']
            });
        } else {
            transaction = await this.portfolioTransactionRepository.findOne({ where: { id: data.id } });
        }

        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${data.id} not found`);
        }

        if (data.ticker_id) {
            const tickerExists = await this.tickerRepository.exists({
                where: { id: data.ticker_id }
            });

            if (!tickerExists) {
                throw new NotFoundException(`Ticker with ID ${data.ticker_id} not found`);
            }
        }

        if (data.treasury_id) {
            const treasuryExists = await this.treasuriesRepository.exists({
                where: { id: data.treasury_id }
            });

            if (!treasuryExists) {
                throw new NotFoundException(`Treasury with ID ${data.treasury_id} not found`);
            }
        }

        if (data.fund_id) {
            const fundExists = await this.fundsRepository.exists({
                where: { id: data.fund_id }
            });

            if (!fundExists) {
                throw new NotFoundException(`Fund with ID ${data.fund_id} not found`);
            }
        }

        if (data.asset_type === 'FIXED_INCOME' && (
            !data.issuer ||
            !data.investment_type ||
            !data.indexation_type ||
            !data.expiration_date ||
            !data.indexer ||
            !data.currency ||
            !data.indexer_rate
        )) {
            throw new NotFoundException(`Missing required fields for fixed income transaction`);
        }

        if (data.asset_type === 'FIXED_INCOME') {
            const fixed_income_details_data: any = {};

            if (data.issuer !== undefined) fixed_income_details_data.issuer = data.issuer;
            if (data.investment_type !== undefined) fixed_income_details_data.investment_type = data.investment_type;
            if (data.indexation_type !== undefined) fixed_income_details_data.indexation_type = data.indexation_type;
            if (data.expiration_date !== undefined) fixed_income_details_data.expiration_date = data.expiration_date;
            if (data.indexer !== undefined) fixed_income_details_data.indexer = data.indexer;
            if (data.currency !== undefined) fixed_income_details_data.currency = data.currency;
            if (data.indexer_rate !== undefined) fixed_income_details_data.indexer_rate = data.indexer_rate;

            if (transaction.fixed_income_details) {
                await this.fixedIncomeDetailsRepository.update(transaction.fixed_income_details.id, fixed_income_details_data);
            } else {
                transaction.fixed_income_details = await this.fixedIncomeDetailsRepository.save(fixed_income_details_data);
            }
        }

        if (data.portfolio_id !== undefined) {
            transaction.portfolio = { id: data.portfolio_id };
        }
        if (data.ticker_id !== undefined) {
            transaction.ticker = data.ticker_id ? { id: data.ticker_id } : null;
        }
        if (data.treasury_id !== undefined) {
            transaction.treasury = data.treasury_id ? { id: data.treasury_id } : null;
        }
        if (data.fund_id !== undefined) {
            transaction.fund = data.fund_id ? { id: data.fund_id } : null;
        }
        if (data.asset_type !== undefined) {
            transaction.asset_type = data.asset_type;
        }
        if (data.transaction_type !== undefined) {
            transaction.transaction_type = data.transaction_type;
        }
        if (data.amount !== undefined) {
            transaction.amount = data.amount;
        }
        if (data.price_per_unit !== undefined) {
            transaction.price_per_unit = data.price_per_unit;
        }
        if (data.transaction_date !== undefined) {
            transaction.transaction_date = data.transaction_date;
        }
        if (data.quantity !== undefined) {
            transaction.quantity = data.quantity;
        }

        if (data.costs !== undefined) {
            transaction.costs = data.costs;
        }

        const updatedTransaction = await this.portfolioTransactionRepository.save(transaction);

        return updatedTransaction;
    }

    async deleteTransaction(id: string): Promise<any> {
        const transaction = await this.portfolioTransactionRepository.findOne({ where: { id } });

        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }

        return this.portfolioTransactionRepository.remove(transaction);
    }

    async getTransactions(portfolioId: string, individualTransactions: boolean, verbose: boolean = true): Promise<any[]> {
        const portfolioExists = await this.investmentPortfolioRepository.exists({ where: { id: portfolioId } });
        if (!portfolioExists) {
            throw new NotFoundException(`Portfolio with ID ${portfolioId} not found`);
        }

        const transactions = await this.portfolioTransactionRepository.find({
            where: { portfolio: { id: portfolioId } },
            relations: ['ticker', 'fixed_income_details', 'treasury', 'fund'],
            select: {
                id: true,
                transaction_type: true,
                amount: true,
                price_per_unit: true,
                transaction_date: true,
                quantity: true,
                asset_type: true,
                created_at: true,
                ticker: {
                    id: true,
                    ticker: true,
                    asset_name: true,
                    asset_image_url: true,
                    current_price: true,
                    currency: true,
                    asset_type: true,
                    country: true,
                },
            },
        });

        for (const transaction of transactions) {
            if (transaction.fund) {
                const lastFundPrice = await this.getLastFundPrice(transaction.fund.id);
                transaction.fund.current_price = lastFundPrice.price || 0;
            }
        }

        if (individualTransactions) {
            transactions.sort((a, b) => {
                const dateA = new Date(a.created_at).getTime();
                const dateB = new Date(b.created_at).getTime();
                return dateB - dateA;
            });

            return transactions;
        }

        return this.consolidatePortfolio(transactions, verbose);
    }

    async getLastFundPrice(fundId: string) {
        if (!fundId) {
            return {
                date: null,
                price: null,
            };
        }

        const historicalFundQuote: any = await this.historicalFundsQuotesRecordModel.findOne({
            fundId,
        });

        const historicalFundObj = historicalFundQuote?.quotes || {};

        if (!Array.isArray(historicalFundObj)) {
            return {
                date: null,
                price: null,
            };
        }

        if (!historicalFundObj.at(-1) || !historicalFundObj.at(-1).date || !historicalFundObj.at(-1).quote) {
            return {
                date: null,
                price: null,
            }
        }

        return {
            date: historicalFundObj.at(-1).date,
            price: historicalFundObj.at(-1).quote / 1_000_000_000,
        };
    }

    async getIndexerRate(indexer: string, sinceDate: Date): Promise<any> {
        indexer = indexer.toLocaleLowerCase();

        if (indexer !== 'cdi' && indexer !== 'ipca')
            throw new NotFoundException(`Indexer '${indexer}' not found`);

        if (indexer === 'ipca') // Transform since date to the first day of the month
            sinceDate = new Date(sinceDate.toISOString().slice(0, 8) + '01T00:00-0300');

        const indexerRates = await this.economicIndexesRepository.find({
            select: { id: false, slug: true, date: true, value: true, estimate: true },
            where: {
                slug: indexer,
                date: MoreThanOrEqual(sinceDate)
            },
            order: { date: 'ASC' },
        });

        return indexerRates;
    }

    async getFinancialHolidays(year: number): Promise<FinancialHolidaysEntity[]> {
        const holidays = await this.financialHolidaysRepository.find({
            where: {
                date: Between(
                    new Date(year + '-01-01T00:00-0300'),
                    new Date((year + 1) + '-01-01T00:00-0300')
                )
            },
            order: { date: 'ASC' },
        });

        return holidays;
    }

    async getWorkDaysOfMonth(year: number, month: number): Promise<EconomicIndexesEntity[]> {
        const monthStr = (month + 1).toString().padStart(2, '0');

        const holidays = await this.getFinancialHolidays(year);
        const holidaysSet = new Set(holidays.map(holiday => new Date(holiday.date + 'T00:00-0300').toISOString()));

        const workDays: EconomicIndexesEntity[] = [];
        for (let date = new Date(year + `-${monthStr}-01T00:00-0300`); date.getMonth() === month; date.setDate(date.getDate() + 1)) {
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isHoliday = holidaysSet.has(date.toISOString());

            if (!isWeekend && !isHoliday) {
                workDays.push({
                    date: new Date(date.getTime()),
                    slug: '',
                    value: 0,
                    estimate: false,
                } as EconomicIndexesEntity);
            }
        }

        return workDays;
    }

    async consolidatePortfolio(transactions: any[], verbose: boolean = true): Promise<any> {
        const grouped: Record<string, any> = {};

        let cdiRates = [];
        let ipcaRates = [];
        const firstCDITransaction = transactions.find((transaction) => transaction.asset_type === 'FIXED_INCOME' && transaction.fixed_income_details.indexer.startsWith('CDI'));
        const firstIPCATransaction = transactions.find((transaction) => transaction.asset_type === 'FIXED_INCOME' && transaction.fixed_income_details.indexer.startsWith('IPCA'));
        const firstPrefixedTransaction = transactions.find((transaction) => transaction.asset_type === 'FIXED_INCOME' && transaction.fixed_income_details.indexer === '+');
        if (firstCDITransaction || firstIPCATransaction || firstPrefixedTransaction) {
            const firstDate = new Date(Math.min(
                firstCDITransaction?.transaction_date.getTime() || Infinity,
                firstIPCATransaction?.transaction_date.getTime() || Infinity,
                firstPrefixedTransaction?.transaction_date.getTime() || Infinity
            ));
            firstDate.setDate(1); // Set to the first day of the month
            firstDate.setHours(0, 0, 0, 0);

            const promises = [this.getIndexerRate('CDI', firstDate)];
            if (firstIPCATransaction) promises.push(this.getIndexerRate('IPCA', firstDate));

            const [_cdiRates, _ipcaRates] = await Promise.all(promises);

            // Formata '_cdiRates'.
            _cdiRates.forEach((r: any) => {
                r.date = new Date(r.date + 'T00:00-0300'); // Converte a data para o formato correto
                r.value = ((Math.pow(r.value / 100 + 1, 1 / 252) - 1) * 100).toFixed(12); // Converte o CDI anual para diário
            });

            let dailyIpcaRates = [];
            if (_ipcaRates) {
                for (const monthIpcaRate of _ipcaRates) {
                    const monthIpcaRateDate = new Date(monthIpcaRate.date + 'T00:00-0300');
                    const month = monthIpcaRateDate.getMonth();

                    let workDaysOfMonth = undefined;
                    if (monthIpcaRate.estimate) {
                        // Se o IPCA for estimado, calcula os dias úteis do mês.
                        workDaysOfMonth = await this.getWorkDaysOfMonth(monthIpcaRateDate.getFullYear(), month);
                    } else {
                        // Se o IPCA não for estimado usa como base os dias do CDI.
                        workDaysOfMonth = _cdiRates.filter((r: EconomicIndexesEntity) => r.date.getMonth() === month && r.date.getFullYear() === monthIpcaRateDate.getFullYear());
                    }

                    const avgDailyRate = ((Math.pow(monthIpcaRate.value / 100 + 1, 1 / workDaysOfMonth.length) - 1) * 100).toFixed(12);
                    const monthDailyIpcaRate = workDaysOfMonth
                        .filter((r: EconomicIndexesEntity) => (r.date.getTime() <= _cdiRates.at(-1).date.getTime()))
                        .map((r: EconomicIndexesEntity) => ({ ...r, value: avgDailyRate, slug: 'ipca', estimate: monthIpcaRate.estimate }));

                    dailyIpcaRates = dailyIpcaRates.concat(monthDailyIpcaRate);
                }
            }

            cdiRates = _cdiRates;
            ipcaRates = dailyIpcaRates;
        }

        const economicIndexes = {
            CDI: cdiRates,
            IPCA: ipcaRates,
            '': cdiRates && cdiRates.map((r: any) => ({ ...r, value: 0, slug: '+', estimate: false })), // "Pre fixed" rates (always 0)
        };

        //sort transactions by transaction_date
        transactions.sort((a, b) => {
            const dateA = new Date(a.transaction_date).getTime();
            const dateB = new Date(b.transaction_date).getTime();
            return dateA - dateB;
        });

        for (const transaction of transactions) {
            const isFixedIncome = transaction.fixed_income_details && !transaction.ticker && !transaction.treasury && !transaction.fund;
            const isTreasury = transaction.treasury && !transaction.ticker && !transaction.fixed_income_details && !transaction.fund;
            const isFund = transaction.fund && !transaction.ticker && !transaction.fixed_income_details && !transaction.treasury;

            let assetId: string;
            let assetName: string;
            let assetType: string;
            let assetCurrency: string = 'BRL';
            let assetImageUrl: string;
            let currentPrice: number = 0;
            let fixedIncomeReturn: number = 0;

            if (isFixedIncome) {
                assetId = transaction.fixed_income_details.id;
                assetName = `${transaction.fixed_income_details.issuer} - ${transaction.fixed_income_details.investment_type}`;
                assetType = transaction.asset_type;
                assetCurrency = transaction.fixed_income_details.currency || 'BRL';
                assetImageUrl = 'https://investidor10.com.br/assets/front/images/money-check-alt.svg';

                const indexer = transaction.fixed_income_details.indexer.replace('+', '');
                const pctgOfIndexer = transaction.fixed_income_details.indexer.includes('+') ? 1 : transaction.fixed_income_details.indexer_rate / 100;
                const prefixedAnnualRate = transaction.fixed_income_details.indexer.includes('+') ? transaction.fixed_income_details.indexer_rate / 100 : 0;
                const prefixedDailyRate = prefixedAnnualRate ? Math.round((Math.pow(prefixedAnnualRate + 1, 1 / 252) - 1) * 1e12) / 1e12 : 0;

                let firstIdx = economicIndexes[indexer].findIndex((i: EconomicIndexesEntity) => i.date.getTime() > transaction.transaction_date.getTime());
                if (firstIdx === -1) firstIdx = economicIndexes[indexer].length;

                fixedIncomeReturn = 1;
                for (let i = firstIdx; i < economicIndexes[indexer].length; i++) {
                    const indexerDailyRate = economicIndexes[indexer][i].value / 100 * pctgOfIndexer;
                    const dailyRate = indexerDailyRate + prefixedDailyRate;
                    fixedIncomeReturn *= (1 + dailyRate);
                }

            } else if (isTreasury) {
                assetId = transaction.treasury.id;
                assetName = `${transaction.treasury.name}`;
                assetType = 'TREASURY';
                assetCurrency = 'BRL';
                assetImageUrl = 'https://www.tesourodireto.com.br/assets/img/td-logo.svg';
                currentPrice = transaction.amount || 0;
            } else if (isFund) {
                assetId = transaction.fund.id;
                assetName = transaction.fund.trade_name;
                assetType = 'FUNDS';
                assetCurrency = 'BRL';
                assetImageUrl = '';
                currentPrice = (transaction.fund.current_price || 0).toFixed(2) || 0;
            } else {
                assetId = transaction.ticker?.ticker || null;
                assetName = transaction.ticker?.asset_name || 'N/A';
                assetType = transaction.ticker?.asset_type || transaction.asset_type || 'N/A';
                assetCurrency = transaction.ticker?.currency || 'BRL';
                assetImageUrl = transaction.ticker?.asset_image_url || 'N/A';
                currentPrice = transaction.ticker ? parseFloat(transaction.ticker.current_price) : 0;
            }

            const amount = parseFloat(transaction.amount);
            const quantity = parseFloat(transaction.quantity);

            if (!grouped[assetId]) {
                grouped[assetId] = {
                    transaction_id: transaction.id,
                    ticker: (!isFixedIncome && !isTreasury) ? assetId : null,
                    fixed_income_details: isFixedIncome ? transaction.fixed_income_details : null,
                    treasury: isTreasury ? transaction.treasury : null,
                    fund: isFund ? transaction.fund : null,
                    asset_name: assetName,
                    asset_image_url: assetImageUrl,
                    asset_type: assetType,
                    currency: assetCurrency,
                    total_amount: 0,
                    total_quantity: 0,
                    quantity,
                    current_price: currentPrice,
                    fixed_income_return: fixedIncomeReturn,
                };
            }

            const asset = grouped[assetId];

            if (transaction.transaction_type === 'BUY') {
                asset.total_amount += amount;
                asset.total_quantity += quantity;
            }

            if (transaction.transaction_type === 'SELL') {
                const sellQuantity = Math.min(quantity, asset.total_quantity);
                const averagePrice =
                    asset.total_quantity > 0 ? asset.total_amount / asset.total_quantity : 0;
                const amountToReduce = sellQuantity * averagePrice;

                asset.total_quantity -= sellQuantity;
                asset.total_amount -= amountToReduce;

                if (asset.total_quantity < 0) asset.total_quantity = 0;
                if (asset.total_amount < 0) asset.total_amount = 0;
            }
        }

        const consolidatedPortfolio = Object.values(grouped)
            .filter((asset) => asset.total_amount > 0)
            .map((asset) => {
                const isFixedIncome = asset.fixed_income_details && !asset.ticker && !asset.treasury && !asset.fund;
                const isTreasury = asset.treasury && !asset.ticker && !asset.fixed_income_details && !asset.fund;
                const isFund = asset.fund && !asset.ticker && !asset.fixed_income_details && !asset.treasury;

                const averagePrice = (isFixedIncome || isTreasury || isFund) ?
                    asset.total_amount :
                    (asset.total_quantity > 0 ? asset.total_amount / asset.total_quantity : 0);

                let currentValue: number;
                let variation: number;

                if (isFixedIncome) {
                    currentValue = asset.total_amount * asset.fixed_income_return;
                    variation = ((currentValue - asset.total_amount) / asset.total_amount) * 100;
                } else if (isTreasury) {
                    const treasuryRate = asset.treasury.rate || 5;
                    const rentabilityFactor = 1 + (treasuryRate / 100);
                    currentValue = asset.total_amount * rentabilityFactor;
                    variation = ((currentValue - asset.total_amount) / asset.total_amount) * 100;
                } else if (isFund) {
                    currentValue = asset.total_quantity * (asset.current_price || 0).toFixed(2);
                    variation = averagePrice > 0 ? ((asset.current_price - averagePrice) / averagePrice) * 100 : 0;
                } else {
                    currentValue = asset.total_quantity * asset.current_price;
                    variation = averagePrice > 0 ? ((asset.current_price - averagePrice) / averagePrice) * 100 : 0;
                }

                const profit = currentValue - asset.total_amount;

                return {
                    ...asset,
                    average_price: (isFixedIncome || isTreasury) ? null : averagePrice.toFixed(2),
                    total_quantity: asset.total_quantity,
                    current_value: currentValue.toFixed(2),
                    profit: profit.toFixed(2),
                    variation: variation.toFixed(2),
                };
            });

        const totalPortfolioValue = consolidatedPortfolio.reduce((acc, asset) => acc + parseFloat(asset.current_value), 0);

        const groupedByCategory: Record<string, any[]> = {};

        for (const asset of consolidatedPortfolio) {
            const percentage =
                totalPortfolioValue > 0
                    ? ((parseFloat(asset.current_value) / totalPortfolioValue) * 100).toFixed(2)
                    : '0.00';

            const categoryName = this.languagesService.translateAssetType(asset.asset_type, asset.currency);

            if (!groupedByCategory[categoryName]) {
                groupedByCategory[categoryName] = [];
            }

            groupedByCategory[categoryName].push({
                ...asset,
                percentage,
                category_name: categoryName,
            });
        }

        if (verbose) {
            return Object.entries(groupedByCategory).map(([category, assets]) => {
                return {
                    category,
                    assets,
                }
            });
        }

        return Object.entries(groupedByCategory).map(([category, assets]) => {
            const totalPercentage = assets.reduce(
                (acc, asset) => acc + parseFloat(asset.percentage),
                0
            );

            return {
                category,
                total_percentage: totalPercentage.toFixed(2),
            };
        });
    }

    async calculateIndexProfitabilityByMonth(transaction: PortfolioTransactionEntity, monthYear: string): Promise<any> {
        if (!/^\d{4}-\d{2}$/.test(monthYear)) {
            console.log('Invalid month/year format:', monthYear);
            throw new HttpException('O formato do mês/ano deve ser YYYY-MM.', 400);
        }

        let cdiRates = [];
        let ipcaRates = [];

        const transactionDate = new Date(transaction.transaction_date);
        transactionDate.setHours(0, 0, 0, 0);

        const currentMonthDate = new Date(monthYear + '-01T00:00-0300');
        currentMonthDate.setDate(1);
        currentMonthDate.setHours(0, 0, 0, 0);

        const indexerType = transaction.fixed_income_details.indexer.startsWith('CDI') ? 'CDI' :
            transaction.fixed_income_details.indexer.startsWith('IPCA') ? 'IPCA' : null;

        const promises = [this.getIndexerRate('CDI', transactionDate)];
        if (indexerType === 'IPCA') promises.push(this.getIndexerRate('IPCA', transactionDate));

        const [_cdiRates, _ipcaRates] = await Promise.all(promises);

        _cdiRates.forEach((r: any) => {
            r.date = new Date(r.date + 'T00:00-0300');
            r.value = ((Math.pow(r.value / 100 + 1, 1 / 252) - 1) * 100).toFixed(12);
        });

        let dailyIpcaRates = [];
        if (_ipcaRates) {
            for (const monthIpcaRate of _ipcaRates) {
                const monthIpcaRateDate = new Date(monthIpcaRate.date + 'T00:00-0300');
                const month = monthIpcaRateDate.getMonth();

                let workDaysOfMonth = undefined;
                if (monthIpcaRate.estimate) {
                    workDaysOfMonth = await this.getWorkDaysOfMonth(monthIpcaRateDate.getFullYear(), month);
                } else {
                    workDaysOfMonth = _cdiRates.filter((r: EconomicIndexesEntity) => r.date.getMonth() === month && r.date.getFullYear() === monthIpcaRateDate.getFullYear());
                }

                const avgDailyRate = ((Math.pow(monthIpcaRate.value / 100 + 1, 1 / workDaysOfMonth.length) - 1) * 100).toFixed(12);
                const monthDailyIpcaRate = workDaysOfMonth
                    .filter((r: EconomicIndexesEntity) => (r.date.getTime() <= _cdiRates.at(-1).date.getTime()))
                    .map((r: EconomicIndexesEntity) => ({ ...r, value: avgDailyRate, slug: 'ipca', estimate: monthIpcaRate.estimate }));

                dailyIpcaRates = dailyIpcaRates.concat(monthDailyIpcaRate);
            }
        }

        cdiRates = _cdiRates;
        ipcaRates = dailyIpcaRates;

        const economicIndexes = {
            CDI: cdiRates,
            IPCA: ipcaRates,
            '': cdiRates && cdiRates.map((r: any) => ({ ...r, value: 0, slug: '+', estimate: false })),
        };

        let fixedIncomeReturn: number = 0;

        const indexer = transaction.fixed_income_details.indexer.replace('+', '');
        const pctgOfIndexer = transaction.fixed_income_details.indexer.includes('+') ? 1 : transaction.fixed_income_details.indexer_rate / 100;
        const prefixedAnnualRate = transaction.fixed_income_details.indexer.includes('+') ? transaction.fixed_income_details.indexer_rate / 100 : 0;
        const prefixedDailyRate = prefixedAnnualRate ? Math.round((Math.pow(prefixedAnnualRate + 1, 1 / 252) - 1) * 1e12) / 1e12 : 0;

        let firstIdx = economicIndexes[indexer].findIndex((i: EconomicIndexesEntity) => i.date.getTime() > transaction.transaction_date.getTime());
        if (firstIdx === -1) firstIdx = economicIndexes[indexer].length;

        fixedIncomeReturn = 1;
        for (let i = firstIdx; i < economicIndexes[indexer].length; i++) {
            if (
                economicIndexes[indexer][i].date.getFullYear() > currentMonthDate.getFullYear() ||
                (economicIndexes[indexer][i].date.getFullYear() === currentMonthDate.getFullYear() &&
                    economicIndexes[indexer][i].date.getMonth() > currentMonthDate.getMonth())
            ) {
                continue;
            }

            if (economicIndexes[indexer][i].date.getTime() <= transaction.transaction_date.getTime()) {
                continue;
            }

            const indexerDailyRate = economicIndexes[indexer][i].value / 100 * pctgOfIndexer;
            const dailyRate = indexerDailyRate + prefixedDailyRate;
            fixedIncomeReturn *= (1 + dailyRate);
        }

        const currentValue = transaction.amount * fixedIncomeReturn;
        const profit = currentValue - transaction.amount;

        return profit;
    }

    /* ==================================== WALLET IMPORT SECTION ==================================== */

    getPrompt(name: string): string | null {
        return this.prompts[name] || null;
    }

    async processWalletImport(files: Multer.File[], userId: string): Promise<any> {
        let canUseTokens = await this.usersService.canUseTokens(userId);

        if (!canUseTokens) {
            throw new HttpException('Limite de tokens excedido.', 429);
        }

        try {
            const filesContent = await Promise.all(
                files.map(async (file) => {
                    const fileExtension = path.extname(file.originalname).toLowerCase();

                    if (['.jpg', '.jpeg', '.png'].includes(fileExtension)) {
                        return this.processImageFile(file);
                    } else if (fileExtension === '.csv') {
                        return this.processCsvFile(file);
                    } /*else if (['.xlsx', '.xls'].includes(fileExtension)) {
                        return this.processExcelFile(file);
                    }*/ else {
                        return {
                            filename: file.originalname,
                            error: 'Formato de arquivo não suportado',
                        };
                    }
                })
            );

            const validContents = filesContent.filter(content => !content.error);

            if (validContents.length === 0) {
                return {
                    success: false,
                    message: 'Nenhum arquivo válido para processamento',
                    errors: filesContent.map(f => f.error ? `${f.filename}: ${f.error}` : null).filter(Boolean)
                };
            }

            const response = await this.openai.chat.completions.create({
                model: process.env.OPEN_AI_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: this.getPrompt("wallet_import")
                    },
                    {
                        role: 'user',
                        content: [
                            ...validContents.map(content => {
                                if (content.type === 'image') {
                                    return {
                                        type: "image_url",
                                        image_url: {
                                            url: `data:${content.mimeType};base64,${content.data}`
                                        }
                                    } as const;
                                } else {
                                    return {
                                        type: "text",
                                        text: `Arquivo: ${content.filename}\n\nDados:\n${typeof content.data === 'string' ? content.data : JSON.stringify(content.data, null, 2)}`
                                    } as const;
                                }
                            })
                        ]
                    }
                ],
                max_tokens: 4000,
                response_format: { "type": "json_object" },
                temperature: 0.5,
            });

            const aiResponse = JSON.parse(response.choices[0].message?.content || '{}');
            await this.usersService.addTokens(userId, response.usage.total_tokens ? response.usage.total_tokens : 1500);
            //estrutura de erro { success: false, message: 'Erro' }

            try {
                const parsedResponse = JSON.parse(aiResponse);

                return parsedResponse;
            } catch (e) {
                return aiResponse;
            }
        } catch (error) {
            console.error('Erro ao processar importação:', error);
            return {
                success: false,
                message: 'Falha ao processar importação',
                error: error.message
            };
        }
    }

    private async processImageFile(file: Multer.File) {
        const base64Data = file.buffer.toString('base64');
        return {
            filename: file.originalname,
            type: 'image',
            mimeType: file.mimetype,
            data: base64Data
        };
    }

    private async processCsvFile(file: Multer.File): Promise<any> {
        return new Promise((resolve, reject) => {
            const results = [];
            const stream = require('stream');
            const bufferStream = new stream.PassThrough();
            bufferStream.end(file.buffer);

            bufferStream
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => {
                    resolve({
                        filename: file.originalname,
                        type: 'data',
                        data: results
                    });
                })
                .on('error', (error) => {
                    reject({
                        filename: file.originalname,
                        error: `Erro ao processar arquivo CSV: ${error.message}`
                    });
                });
        });
    }

    /* ==================================== END WALLET IMPORT SECTION ==================================== */
}
