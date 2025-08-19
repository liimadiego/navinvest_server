import { UserEntity } from './../entities/user.entity';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InvestmentPortfolioEntity } from '../entities/investment-portfolio.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInvestmentPortfolioDto } from './dto/create-investment-portfolio-dto';
import { UpdateInvestmentPortfolioDto } from './dto/update-investment-portfolio-dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PortfolioDataRecord, PortfolioDataRecordDocument } from '../schemas/portfolio-data-record.schema';
import { LanguagesService } from 'utils/language.service';
import { PortfolioTransactionsService } from 'portfolio-transactions/portfolio-transactions.service';
import { JwtService } from '@nestjs/jwt';
import { HistoricalQuotesRecord, HistoricalQuotesRecordDocument } from '../schemas/historical-quotes.schema';
import { HistoricalTreasuryQuotesRecord, HistoricalTreasuryQuotesRecordDocument } from '../schemas/historical-treasury-quotes.schema';
import { HistoricalFundsQuotesRecord, HistoricalFundsQuotesRecordDocument } from '../schemas/historical-funds-quotes.schema';
import { TickersEntity } from '../entities/tickers.entity';

import * as util from 'node:util';

@Injectable()
export class InvestmentPortfolioService {
    constructor(
        @InjectRepository(InvestmentPortfolioEntity)
        private readonly investmentPortfolioRepository: Repository<InvestmentPortfolioEntity>,
        @InjectRepository(TickersEntity)
        private readonly tickerRepository: Repository<TickersEntity>,
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        @InjectModel(PortfolioDataRecord.name)
        private portfolioDataRecordModel: Model<PortfolioDataRecordDocument>,
        @InjectModel(HistoricalQuotesRecord.name)
        private historicalTickerQuotesRecordModel: Model<HistoricalQuotesRecordDocument>,
        @InjectModel(HistoricalTreasuryQuotesRecord.name)
        private historicalTreasuryQuotesRecordModel: Model<HistoricalTreasuryQuotesRecordDocument>,
        @InjectModel(HistoricalFundsQuotesRecord.name)
        private historicalFundQuotesRecordModel: Model<HistoricalFundsQuotesRecordDocument>,
        private readonly languagesService: LanguagesService,
        private readonly portfolioTransactionsService: PortfolioTransactionsService,
        private jwtService: JwtService
    ) { }

    async create(investmentPortfolio: CreateInvestmentPortfolioDto, userId: string) {
        const user = await this.userRepository.createQueryBuilder('user')
            .where('user.id = :user_id', { user_id: userId })
            .getOne();

        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        const newInvestmentPortfolio = await this.investmentPortfolioRepository.save({ ...investmentPortfolio, user });

        if (!newInvestmentPortfolio) {
            throw new Error('Erro ao criar portfólio de investimentos.');
        }

        const investmentPortfolios = await this.findByUserId(userId);

        return investmentPortfolios;
    }

    async update(investmentPortfolio: UpdateInvestmentPortfolioDto, portfolioId: string, userId: string) {
        const user = await this.userRepository.createQueryBuilder('user')
            .where('user.id = :user_id', { user_id: userId })
            .getOne();

        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        const existingPortfolio = await this.investmentPortfolioRepository.findOne({
            where: {
                id: portfolioId,
                user: {
                    id: user.id
                }
            }
        });

        if (!existingPortfolio) {
            throw new Error('Portfólio de investimentos não encontrado.');
        }

        const updatedPortfolio = await this.investmentPortfolioRepository.save({
            ...existingPortfolio,
            ...investmentPortfolio
        });

        if (!updatedPortfolio) {
            throw new Error('Erro ao atualizar portfólio de investimentos.');
        }

        const investmentPortfolios = await this.findByUserId(userId);
        return investmentPortfolios;
    }

    async delete(portfolioId: string, userId: string) {
        const user = await this.userRepository.createQueryBuilder('user')
            .where('user.id = :user_id', { user_id: userId })
            .getOne();

        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        const existingPortfolio = await this.investmentPortfolioRepository.findOne({
            where: {
                id: portfolioId,
                user: {
                    id: user.id
                }
            }
        });

        if (!existingPortfolio) {
            throw new Error('Portfólio de investimentos não encontrado.');
        }

        const deletedPortfolio = await this.investmentPortfolioRepository.remove(existingPortfolio);
        if (!deletedPortfolio) {
            throw new Error('Erro ao deletar portfólio de investimentos.');
        }

        const investmentPortfolios = await this.findByUserId(userId);
        return investmentPortfolios;
    }

    async findByUserId(userId: string) {
        const user = await this.userRepository.createQueryBuilder('user')
            .where('user.id = :userId', { userId })
            .getOne();

        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        const investment_portfolios = await this.investmentPortfolioRepository.find({
            where: {
                user: {
                    id: user.id
                }
            },
            order: {
                created_at: 'DESC'
            }
        });

        return investment_portfolios;
    }

    async getTransactionsByInvestmentPortfolioId(investmentPortfolioId: string, tickerRelations: boolean = false) {
        // const investmentPortfolio = await this.investmentPortfolioRepository.createQueryBuilder('investment_portfolio')
        //     .leftJoinAndSelect('investment_portfolio.user', 'users')
        //     .leftJoinAndSelect('investment_portfolio.transactions', 'transactions')
        //     .leftJoinAndSelect('transactions.ticker', 'ticker')
        //     .leftJoinAndSelect('transactions.treasury', 'treasury')
        //     .leftJoinAndSelect('transactions.fixed_income_details', 'fixed_income_details')
        //     .leftJoinAndSelect('transactions.fund', 'fund')
        //     .where('investment_portfolio.id = :investmentPortfolioId', { investmentPortfolioId })
        //     .orderBy('transactions.transaction_date', 'ASC')
        //     .getOne();

        let investmentPortfolio = undefined;
        if (tickerRelations) {
            investmentPortfolio = await this.investmentPortfolioRepository.createQueryBuilder('investment_portfolio')
                .leftJoinAndSelect('investment_portfolio.user', 'users')
                .leftJoinAndSelect('investment_portfolio.transactions', 'transactions')
                .leftJoinAndSelect('transactions.ticker', 'ticker')
                .leftJoinAndSelect('ticker.company', 'company')
                .leftJoinAndSelect('ticker.reit', 'reit')
                .leftJoinAndSelect('transactions.treasury', 'treasury')
                .leftJoinAndSelect('transactions.fixed_income_details', 'fixed_income_details')
                .leftJoinAndSelect('transactions.fund', 'fund')
                .where('investment_portfolio.id = :investmentPortfolioId', { investmentPortfolioId })
                .orderBy('transactions.transaction_date', 'ASC')
                .getOne();
        } else {
            investmentPortfolio = await this.investmentPortfolioRepository.createQueryBuilder('investment_portfolio')
                .leftJoinAndSelect('investment_portfolio.user', 'users')
                .leftJoinAndSelect('investment_portfolio.transactions', 'transactions')
                .leftJoinAndSelect('transactions.ticker', 'ticker')
                .leftJoinAndSelect('transactions.treasury', 'treasury')
                .leftJoinAndSelect('transactions.fixed_income_details', 'fixed_income_details')
                .leftJoinAndSelect('transactions.fund', 'fund')
                .where('investment_portfolio.id = :investmentPortfolioId', { investmentPortfolioId })
                .orderBy('transactions.transaction_date', 'ASC')
                .getOne();
        }

        if (!investmentPortfolio) {
            throw new Error(`Portfólio de investimentos (${investmentPortfolioId}) não encontrado.`);
        }

        return investmentPortfolio;
    }

    async getDateOfFirstTransactionByInvestmentPortfolioId(investmentPortfolioId: string, filterBySector: string = null) {
        const investmentPortfolio = await this.investmentPortfolioRepository.createQueryBuilder('investment_portfolio')
            .leftJoinAndSelect('investment_portfolio.transactions', 'transactions')
            .where('investment_portfolio.id = :investmentPortfolioId', { investmentPortfolioId })
            .getOne();

        if (!investmentPortfolio || !investmentPortfolio.transactions || investmentPortfolio.transactions.length === 0) {
            throw new Error('Portfólio de investimentos ou transações não encontrado.');
        }

        if (filterBySector) {
            const filterPromises = investmentPortfolio.transactions.map(async transaction => {
                if (!transaction.ticker) {
                    return false;
                }

                const ticker = await this.tickerRepository.findOne({
                    where: { id: transaction.ticker.id },
                    relations: ['company', 'reit']
                });

                if (!ticker || (!ticker.company && !ticker.reit)) {
                    return false;
                }

                const stringFilterBySector = ticker.company ? `${ticker.company.b3_sector} - ${ticker.company.b3_subsector}` : `${ticker.reit.b3Sector} - ${ticker.reit.b3Subsector}`;
                return stringFilterBySector === filterBySector;
            });

            const filterResults = await Promise.all(filterPromises);
            investmentPortfolio.transactions = investmentPortfolio.transactions.filter((_, index) => filterResults[index]);
        }

        const firstTransactionDate = investmentPortfolio.transactions.reduce((earliest, transaction) => {
            const transactionDate = new Date(transaction.transaction_date);
            return earliest < transactionDate ? earliest : transactionDate;
        }, new Date(investmentPortfolio.transactions[0].transaction_date));

        return firstTransactionDate;
    }

    async getSectorsAvailableFromPortfolio(investmentPortfolioId: string) {
        const investmentPortfolio = await this.getTransactionsByInvestmentPortfolioId(investmentPortfolioId);
        if (!investmentPortfolio) {
            throw new Error('Portfólio de investimentos não encontrado.');
        }

        const filteredTransactions = investmentPortfolio.transactions.filter(transaction => transaction.ticker);

        const sectors = new Set<string>();
        for (const transaction of filteredTransactions) {
            const ticker = await this.tickerRepository.findOne({
                where: { id: transaction.ticker.id },
                relations: ['company', 'reit']
            });
            if (ticker) {
                if (ticker.company && ticker.company.b3_sector && ticker.company.b3_subsector) {
                    sectors.add(`${ticker.company.b3_sector} - ${ticker.company.b3_subsector}`);
                } else if (ticker.reit && ticker.reit.b3Sector && ticker.reit.b3Subsector) {
                    sectors.add(`${ticker.reit.b3Sector} - ${ticker.reit.b3Subsector}`);
                }
            }
        }

        return sectors.size > 0 ? Array.from(sectors) : null;
    }

    async getTotalAssetsByInvestmentPortfolioId(investmentPortfolioId: string, userId: string, last12Months: boolean = false, filterBySector: string = null) {
        try {
            const investmentPortfolio = await this.getTransactionsByInvestmentPortfolioId(investmentPortfolioId, !!filterBySector);
            if (userId != investmentPortfolio.user.id) {
                throw new Error(`Portfolio not found`);
            }

            if (investmentPortfolio.transactions.length > 0) {
                // console.log('First 5 transactions:', investmentPortfolio.transactions.slice(0, 5));

                const firstTransactionDate = investmentPortfolio.transactions[0].transaction_date; // new Date(await this.getDateOfFirstTransactionByInvestmentPortfolioId(investmentPortfolioId));

                if (filterBySector) {
                    /*
                    const filterPromises = investmentPortfolio.transactions.map(async transaction => {
                        if (!transaction.ticker) {
                            return false;
                        }

                        const ticker = await this.tickerRepository.findOne({
                            where: { id: transaction.ticker.id },
                            relations: ['company', 'reit']
                        });

                        if (!ticker || (!ticker.company && !ticker.reit)) {
                            return false;
                        }

                        const stringFilterBySector = ticker.company ? `${ticker.company.b3_sector} - ${ticker.company.b3_subsector}` : `${ticker.reit.b3Sector} - ${ticker.reit.b3Subsector}`;
                        return stringFilterBySector === filterBySector;
                    });

                    const filterResults = await Promise.all(filterPromises);
                    investmentPortfolio.transactions = investmentPortfolio.transactions.filter((_, index) => filterResults[index]);
                    */
                    investmentPortfolio.transactions = investmentPortfolio.transactions
                        .filter(({ ticker }) => {
                            if ((!ticker) || (!ticker.company && !ticker.reit)) {
                                return false;
                            }
                            const stringFilterBySector = ticker.company ? `${ticker.company.b3_sector} - ${ticker.company.b3_subsector}` : `${ticker.reit.b3Sector} - ${ticker.reit.b3Subsector}`;
                            return stringFilterBySector === filterBySector;
                        });
                }

                const firstTransactionYear = firstTransactionDate.getFullYear();
                const firstTransactionMonth = firstTransactionDate.getMonth() + 1;

                let totalAssets = undefined;
                if (last12Months) {
                    const quotesCache = {};
                    totalAssets = {};
                    let proms = {};
                    const monthBalances = {};
                    const currentBalance = {};
                    let currentMonth = undefined;
                    for (const transaction of investmentPortfolio.transactions) {
                        const isTreasury = transaction.treasury !== null && transaction.treasury !== undefined;
                        const isFixedIncome = transaction.fixed_income_details !== null && transaction.fixed_income_details !== undefined;
                        const isTicker = transaction.ticker !== null && transaction.ticker !== undefined;
                        const isFund = transaction.fund !== null && transaction.fund !== undefined;

                        // const historicalQuotesData = isTicker ?
                        //     await this.historicalQuotesRecordModel.findOne({ tickerId: transaction.ticker.id }) :
                        //     isTreasury ?
                        //         await this.historicalTreasuryQuotesRecordModel.findOne({ treasuryId: transaction.treasury.id }) :
                        //         isFund ?
                        //             await this.historicalFundsQuotesRecordModel.findOne({ fundId: transaction.fund.id }) :
                        //             null;

                        let quoteId = null;
                        let quoteType = null;
                        if (isTicker) {
                            quoteId = transaction.ticker.id;
                            quoteType = 'Ticker';
                        } else if (isTreasury) {
                            quoteId = transaction.treasury.id;
                            quoteType = 'Treasury';
                        } else if (isFund) {
                            quoteId = transaction.fund.id;
                            quoteType = 'Fund';
                        }

                        // let historicalQuotesObj: any = [];
                        // if (historicalQuotesData) {
                        //     historicalQuotesObj = historicalQuotesData.toObject().quotes.slice(-15);
                        // }
                        if (quoteType && quoteId) {
                            if (!quotesCache[quoteType]) {
                                quotesCache[quoteType] = {};
                            }
                            const pKey = `${quoteType}_${quoteId}`;
                            if ((!quotesCache[quoteType][quoteId]) && (!proms[pKey])) {
                                proms[pKey] = this[`historical${quoteType}QuotesRecordModel`]
                                                .findOne({ [`${quoteType.toLowerCase()}Id`]: quoteId })
                                                .then(records => {
                                                    if (records) {
                                                        const quotes = records.toObject().quotes.slice(-12);
                                                        const quotesObj = quotes.reduce((obj :any, q :any) => ({
                                                            ...obj,
                                                            [q.date.slice(0, 7)]: q
                                                        }), {});
                                                        quotesCache[quoteType][quoteId] = quotesObj;
                                                    } else {
                                                        console.warn(`No historical quotes found for ${quoteType} with ID ${quoteId} (${transaction.ticker.ticker})`);
                                                    }
                                                });
                                    
                                /*
                                quotesCache[quoteType][quoteId] =  (
                                    await this[`historical${quoteType}QuotesRecordModel`]
                                        .findOne({ [`${quoteType.toLowerCase()}Id`]: quoteId })
                                )
                                .toObject().quotes.slice(-15);
                                */
                            }
                        } else {
                            console.warn(`Could not determine quote type for transaction:`, transaction, '\n ');
                            continue;
                        }
                        
                        
                        const transactionDate = new Date(transaction.transaction_date);
                        transactionDate.setUTCHours(3, 0, 0, 0);
                        const tYear = transactionDate.getFullYear();
                        const tMonth = (transactionDate.getMonth() + 1).toString().padStart(2, '0');
                        const monthKey = `${tYear}-${tMonth}`;

                        if (currentMonth && monthKey !== currentMonth) {
                            let totalInvested = 0;
                            for (const quoteTypeKey in currentBalance) {
                                for (const quoteIdKey in currentBalance[quoteTypeKey]) {
                                    totalInvested += currentBalance[quoteTypeKey][quoteIdKey].cost;
                                }
                            }

                            monthBalances[currentMonth] = { 
                                monthStr: monthKey,
                                monthTS: Date.UTC(tYear, parseInt(tMonth) - 1, 1, 3),
                                totalInvested,
                                balance: { ...currentBalance },
                            };
                        }
                        currentMonth = monthKey;

                        // Process the transaction
                        if (!currentBalance[quoteType]) {
                            currentBalance[quoteType] = {};
                        }
                        if (!currentBalance[quoteType][quoteId]) {
                            currentBalance[quoteType][quoteId] = { quantity: 0, cost: 0, avgPrice: 0 };
                        }
                        const bal = currentBalance[quoteType][quoteId];
                        if (transaction.transaction_type === 'BUY') {
                            bal.quantity += transaction.quantity * 1;
                            bal.cost += transaction.price_per_unit * transaction.quantity;
                            bal.avgPrice = bal.cost / bal.quantity;
                        } else if (transaction.transaction_type === 'SELL') {
                            bal.quantity -= transaction.quantity * 1;
                            if (!bal.quantity) {
                                delete currentBalance[quoteType][quoteId];
                            } else {
                                bal.cost = bal.quantity * bal.avgPrice;
                            }
                        } else {
                            throw new Error(`Tipo de transação inválido: ${transaction.transaction_type}`);
                        }

                        // for (const monthYear of last12MonthsArray) {
                        //     const month = monthYear.month;
                        //     const year = monthYear.year;

                        //     const transactionDate = new Date(transaction.transaction_date);
                        //     transactionDate.setUTCHours(3, 0, 0, 0);

                        //     if (
                        //         (
                        //             year > firstTransactionYear ||
                        //             (year == firstTransactionYear && month >= firstTransactionMonth)
                        //         ) &&
                        //         (
                        //             year > transactionDate.getFullYear() ||
                        //             (year == transactionDate.getFullYear() && month >= transactionDate.getMonth() + 1)
                        //         )
                        //     ) {
                        //         if (isFixedIncome) {
                        //             const monthYearFormatted = `${year}-${month.toString().padStart(2, '0')}`;
                        //             const monthReturn = await this.portfolioTransactionsService.calculateIndexProfitabilityByMonth(transaction, monthYearFormatted);

                        //             if (!totalAssets[`${month}-${year}`]) {
                        //                 totalAssets[`${month}-${year}`] = { month, year, totalAssets: 0, totalInvested: 0, currency: 'BRL' };
                        //             }

                        //             totalAssets[`${month}-${year}`].totalAssets = parseFloat((totalAssets[`${month}-${year}`].totalAssets + monthReturn).toFixed(2));
                        //         }

                        //         const monthQuote = historicalQuotesObj.find(
                        //             (quote: any) => quote.date.slice(0, 7) === `${year}-${month.toString().padStart(2, '0')}`
                        //         );

                        //         const monthQuotePrice = monthQuote ?
                        //             (isTreasury ? monthQuote?.unit_price :
                        //                 isFund ? (monthQuote?.quote / 1_000_000_000) :
                        //                     monthQuote?.adj_close
                        //             ) : undefined;

                        //         const currentDate = new Date();
                        //         const isCurrentMonth = currentDate.getFullYear() === year && currentDate.getMonth() + 1 === month;

                        //         const monthTotalAssets = await this.sumTransactionsTotal([transaction], isCurrentMonth ? undefined : monthQuotePrice);

                        //         if (!totalAssets[`${month}-${year}`]) {
                        //             totalAssets[`${month}-${year}`] = { month, year, totalAssets: 0, totalInvested: 0, currency: 'BRL' };
                        //         }

                        //         totalAssets[`${month}-${year}`].totalAssets = parseFloat((totalAssets[`${month}-${year}`].totalAssets + monthTotalAssets).toFixed(2));
                        //     } else {
                        //         if (!totalAssets[`${month}-${year}`]) {
                        //             totalAssets[`${month}-${year}`] = { month, year, totalAssets: 0, totalInvested: 0, currency: 'BRL' };
                        //         }
                        //     }
                        // }
                    }

                    const last12MonthsArray = this.getLastTwelveMonths();
                    const monthBalancesArray = Object.values(monthBalances)
                        .sort((a :any, b :any) => a.monthTS - b.monthTS);
                    // console.log(`monthBalancesArray:`, util.inspect(monthBalancesArray, { depth: Infinity, colors: true }), '\n ');
                    // console.log('last12MonthsArray:', last12MonthsArray, '\n ');

                    // Wait for quotesCache promises to resolve
                    await Promise.all(Object.values(proms));

                    for (const { month, year } of last12MonthsArray) {
                        const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
                        const monthTS = Date.UTC(year, month - 1, 1, 3);
                        const { balance = {}, totalInvested = 0 } = monthBalancesArray.findLast((mb :any) => mb.monthTS <= monthTS) as any;
                    
                        let _totalAssets = 0;
                        let lastQuotation = {};
                        for (const quoteTypeKey in balance) {
                            for (const quoteIdKey in balance[quoteTypeKey]) {
                                const bal = balance[quoteTypeKey][quoteIdKey];

                                const quotationKey = `${quoteTypeKey}_${quoteIdKey}`;
                                const quotation = quotesCache?.[quoteTypeKey]?.[quoteIdKey]?.[monthStr] || lastQuotation?.[quotationKey];
                                if (!quotation) {
                                    _totalAssets += bal.cost;
                                    // console.warn(`No quotation found for ${quotationKey} on ${monthStr}.`);
                                    continue;
                                }
                                lastQuotation[quotationKey] = quotation;

                                bal.mktPrice = quotation.adj_close;
                                bal.value = bal.mktPrice * bal.quantity;
                                _totalAssets += bal.value;
                            }
                        }

                        totalAssets[`${month}-${year}`] = {
                            month: month,
                            year: year,
                            totalAssets: parseFloat(_totalAssets.toFixed(2)),
                            totalInvested: parseFloat(totalInvested.toFixed(2)),
                            currency: 'BRL'
                        };
                    }

                    // for (const monthYear in totalAssets) {
                    //     const [month, year] = monthYear.split('-');
                    //     const monthTotalInvested = await this.sumTransactionsTotalInvested(investmentPortfolio.transactions.filter(t => t.transaction_date.getTime() < Date.UTC(parseInt(year), parseInt(month), 1, 3)));
                    //     totalAssets[`${month}-${year}`].totalInvested = parseFloat((totalAssets[`${month}-${year}`].totalInvested + monthTotalInvested).toFixed(2));
                    // }
                } else {
                    totalAssets = await this.sumTransactionsTotal(investmentPortfolio.transactions);
                }

                return {
                    investmentPortfolioId: investmentPortfolio.id,
                    totalAssets: typeof totalAssets === 'number' ? parseFloat(totalAssets.toFixed(2)) : Object.values(totalAssets),
                    portfolioName: investmentPortfolio.name
                };
            } else {
                return {
                    investmentPortfolioId: investmentPortfolio.id,
                    totalAssets: last12Months ? [] : 0,
                    portfolioName: investmentPortfolio.name
                };
            }
            
        } catch (error) {
            console.error('Error in getTotalAssetsByInvestmentPortfolioId:', error);
            throw new BadRequestException(error)
        }
    }

    async sumTransactionsTotal(
        transactions: any[],
        final_price: any = undefined
    ) {
        let total = 0;

        for (const transaction of transactions) {
            let originalFinalPrice = final_price;
            const amount = Number(transaction.amount);
            const quantity = Number(transaction.quantity);
            const price_per_unit = Number(transaction.price_per_unit);

            if (originalFinalPrice === undefined && transaction.ticker) {
                originalFinalPrice = Number(transaction.ticker.current_price);
            }

            if (originalFinalPrice === undefined && transaction.treasury) {
                originalFinalPrice = Number(transaction.treasury.unit_price);
            }

            if (originalFinalPrice === undefined && transaction.fund) {
                const lastFundPrice = await this.portfolioTransactionsService.getLastFundPrice(transaction.fund.id);
                originalFinalPrice = (lastFundPrice ? Number(lastFundPrice.price) : 0).toFixed(2);
            }

            if (
                transaction.asset_type !== 'FIXED_INCOME' && 
                transaction.asset_type !== 'TREASURY' && 
                transaction.asset_type !== 'FUNDS'
            ) {
                if (transaction.transaction_type === 'SELL') {
                    total -= (quantity * price_per_unit);
                } else {
                    total += (quantity * originalFinalPrice);
                }
            } else if (transaction.asset_type === 'FIXED_INCOME') {
                if (transaction.transaction_type === 'SELL') {
                    total -= amount;
                } else {
                    total += amount;
                }
            } else if (transaction.asset_type === 'TREASURY') {
                const currentAmount = transaction.quantity * originalFinalPrice;

                if (transaction.transaction_type === 'SELL') {
                    total -= currentAmount;
                } else {
                    total += currentAmount;
                }
            } else if (transaction.asset_type === 'FUNDS') {
                const currentAmount = transaction.quantity * originalFinalPrice;
                if (transaction.transaction_type === 'SELL') {
                    total -= currentAmount;
                } else {
                    total += currentAmount;
                }
            }
        }

        return total;
    };

    async sumTransactionsTotalInvested(transactions: any[]) {
        let total = 0;

        for (const transaction of transactions) {
            const amount = Number(transaction.amount);
            const quantity = Number(transaction.quantity);
            const price_per_unit = Number(transaction.price_per_unit);

            if (transaction.asset_type !== 'FIXED_INCOME' && transaction.asset_type !== 'TREASURY' && transaction.asset_type !== 'FUNDS') {
                if (transaction.transaction_type === 'SELL') {
                    total -= (quantity * price_per_unit);
                } else {
                    total += (quantity * price_per_unit);
                }
            } else if (transaction.asset_type === 'FIXED_INCOME') {
                if (transaction.transaction_type === 'SELL') {
                    total -= amount;
                } else {
                    total += amount;
                }
            } else if (transaction.asset_type === 'TREASURY') {
                const currentAmount = transaction.quantity * transaction.treasury.unit_price;
                if (transaction.transaction_type === 'SELL') {
                    total -= currentAmount;
                } else {
                    total += currentAmount;
                }
            } else if (transaction.asset_type === 'FUNDS') {
                const lastFundPrice = await this.portfolioTransactionsService.getLastFundPrice(transaction.fund.id);
                const lfp = (lastFundPrice ? Number(lastFundPrice.price) : 0).toFixed(2);
                const currentAmount = transaction.quantity * Number(lfp);
                if (transaction.transaction_type === 'SELL') {
                    total -= currentAmount;
                } else {
                    total += currentAmount;
                }
            }
        }

        return total;
    };

    async getTotalInvestedByInvestmentPortfolioId(investmentPortfolioId: string, userId: string, last12Months: boolean = false, filterBySector: string = null) {
        try {
            const investmentPortfolio = await this.getTransactionsByInvestmentPortfolioId(investmentPortfolioId);
            if (userId != investmentPortfolio.user.id) {
                throw new Error(`Portfolio not found`);
            }

            let totalInvested = 0;

            if (filterBySector) {
                const filterPromises = investmentPortfolio.transactions.map(async transaction => {
                    if (!transaction.ticker) {
                        return false;
                    }

                    const ticker = await this.tickerRepository.findOne({
                        where: { id: transaction.ticker.id },
                        relations: ['company', 'reit']
                    });

                    if (!ticker || (!ticker.company && !ticker.reit)) {
                        return false;
                    }

                    const stringFilterBySector = ticker.company ? `${ticker.company.b3_sector} - ${ticker.company.b3_subsector}` : `${ticker.reit.b3Sector} - ${ticker.reit.b3Subsector}`;
                    return stringFilterBySector === filterBySector;
                });

                const filterResults = await Promise.all(filterPromises);
                investmentPortfolio.transactions = investmentPortfolio.transactions.filter((_, index) => filterResults[index]);
            }

            for (const transaction of investmentPortfolio.transactions) {
                const amount = Number(transaction.amount);
                const quantity = Number(transaction.quantity);
                const price_per_unit = Number(transaction.price_per_unit);

                if (transaction.asset_type !== 'FIXED_INCOME' && transaction.asset_type !== 'TREASURY' && transaction.asset_type !== 'FUNDS') {
                    if (transaction.transaction_type === 'SELL') {
                        totalInvested -= (quantity * price_per_unit);
                    } else {
                        totalInvested += (quantity * price_per_unit);
                    }
                } else if (transaction.asset_type === 'FIXED_INCOME') {
                    if (transaction.transaction_type === 'SELL') {
                        totalInvested -= amount;
                    } else {
                        totalInvested += amount;
                    }
                } else if (transaction.asset_type === 'TREASURY') {
                    if (transaction.transaction_type === 'SELL') {
                        totalInvested -= amount;
                    } else {
                        totalInvested += amount;
                    }
                } else if (transaction.asset_type === 'FUNDS') {
                    if (transaction.transaction_type === 'SELL') {
                        totalInvested -= amount;
                    } else {
                        totalInvested += amount;
                    }
                }
            }

            return {
                investmentPortfolioId: investmentPortfolio.id,
                totalInvested: parseFloat(totalInvested.toFixed(2)),
                portfolioName: investmentPortfolio.name,
            };
        } catch (error) {
            throw new BadRequestException(error)
        }
    }

    async insertOrUpdatePortfolioDataRecord(portfolioId: string, record: any) {
        try {
            const month = record.month || new Date().getMonth() + 1;
            const year = record.year || new Date().getFullYear();
            const currency = record.currency || 'BRL';
            const totalAssets = record.totalAssets;
            const totalInvested = record.totalInvested;

            const existingRecord = await this.portfolioDataRecordModel.findOne({
                portfolioId: portfolioId
            });

            if (!existingRecord) {
                const newRecord = new this.portfolioDataRecordModel({
                    portfolioId,
                    date: new Date(),
                    data: record,
                });

                await newRecord.save();

                return newRecord;
            } else {
                const data = existingRecord.data;

                const existingData = data.find((d: any) => d.month === month.toString() && d.year === year.toString());

                if (existingData) {
                    existingData.totalAssets = totalAssets;
                    existingData.totalInvested = totalInvested;
                    existingData.currency = currency;
                } else {
                    data.push({
                        month: month.toString(),
                        year: year.toString(),
                        totalAssets,
                        totalInvested,
                        currency
                    });
                }

                await this.portfolioDataRecordModel.updateOne(
                    { portfolioId },
                    {
                        $set: {
                            data: data,
                        },
                    }
                );

                return existingRecord;
            }


        } catch (error) {
            throw new Error(`Erro ao salvar registro de ativos: ${error.message}`);
        }
    }

    async getPortfolioDataByPortfolioId(portfolioId: string, userId: string, filterBySector: string = null) {
        const { totalAssets } = await this.getTotalAssetsByInvestmentPortfolioId(portfolioId, userId, true, filterBySector);
        const filteredData :any = typeof totalAssets === 'number' ? 
            [] : 
            Object.values(totalAssets)
                .sort((a :any, b :any) => {
                    const dateA = new Date(a.year, a.month - 1);
                    const dateB = new Date(b.year, b.month - 1);
                    return dateB.getTime() - dateA.getTime(); // DESC order by date (Newest first)
                });

        if (filterBySector) {
            return {
                historicalData: filteredData
            }
        }

        const currentTotalAssets = filteredData[0]; // await this.getTotalAssetsByInvestmentPortfolioId(portfolioId, userId, false, filterBySector);
        const currentTotalInvested = filteredData[0]; // await this.getTotalInvestedByInvestmentPortfolioId(portfolioId, userId, false, filterBySector);
        const portfolioDivision = await this.portfolioTransactionsService.getTransactions(portfolioId, false, false);

        return {
            portfolioId: portfolioId,
            historicalData: filteredData,
            currentTotalAssets: currentTotalAssets.totalAssets,
            currentTotalInvested: currentTotalInvested.totalInvested,
            portfolioName: currentTotalAssets.portfolioName,
            portfolioDivision: filterBySector ? null : portfolioDivision,
        }
    }

    async getUserIdByHeaderRequest(request: any) {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        const token = authHeader.substring(7);

        const decoded = this.jwtService.decode(token) as { sub: string, email: string };

        return decoded.sub || null;
    }

    getLastTwelveMonths() {
        const today = new Date();
        const lastTwelveMonths = [];
        for (let i = 0; i < 12; i++) {
            const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
            lastTwelveMonths.push({
                month: month.getMonth() + 1,
                year: month.getFullYear(),
            });
        }
        return lastTwelveMonths.reverse();
    }

    async getPortfolioDataToAI(portfolioId: string, userId: string) {
        const portfolioData = await this.getPortfolioDataByPortfolioId(portfolioId, userId);
        if (!portfolioData) {
            throw new Error('Portfolio data not found.');
        }

        const annualPerformance = await this.portfolioTransactionsService.getTransactions(portfolioId, false, true);

        if (!annualPerformance) {
            throw new Error('Annual performance data not found.');
        }

        const userInvestorProfile = await this.userRepository.createQueryBuilder('user')
            .leftJoinAndSelect('user.investorProfiles', 'investorProfile')
            .where('user.id = :userId', { userId })
            .getOne();

        let userInvestorProfileName = null;
        if (userInvestorProfile && userInvestorProfile.investorProfiles) {
            userInvestorProfileName = userInvestorProfile.investorProfiles.map(profile => profile)[0].profile;
        }

        const portfolioDataToAI = {
            historicalData: portfolioData.historicalData,
            currentTotalAssets: portfolioData.currentTotalAssets,
            currentTotalInvested: portfolioData.currentTotalInvested,
            portfolioDivision: portfolioData.portfolioDivision,
            annualPerformance: annualPerformance,
            userInvestorProfile: userInvestorProfileName,
        };

        return portfolioDataToAI;
    }
}