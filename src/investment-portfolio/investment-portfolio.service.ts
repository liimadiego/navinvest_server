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

@Injectable()
export class InvestmentPortfolioService {
    constructor(
        @InjectRepository(InvestmentPortfolioEntity)
        private readonly investmentPortfolioRepository: Repository<InvestmentPortfolioEntity>,
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        @InjectModel(PortfolioDataRecord.name)
        private portfolioDataRecordModel: Model<PortfolioDataRecordDocument>,
        @InjectModel(HistoricalQuotesRecord.name)
        private historicalQuotesRecordModel: Model<HistoricalQuotesRecordDocument>,
        @InjectModel(HistoricalTreasuryQuotesRecord.name)
        private historicalTreasuryQuotesRecordModel: Model<HistoricalTreasuryQuotesRecordDocument>,
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

    async getTransactionsByInvestmentPortfolioId(investmentPortfolioId: string) {
        const investmentPortfolio = await this.investmentPortfolioRepository.createQueryBuilder('investment_portfolio')
            .leftJoinAndSelect('investment_portfolio.user', 'users')
            .leftJoinAndSelect('investment_portfolio.transactions', 'transactions')
            .leftJoinAndSelect('transactions.ticker', 'ticker')
            .leftJoinAndSelect('transactions.treasury', 'treasury')
            .leftJoinAndSelect('transactions.fixed_income_details', 'fixed_income_details')
            .where('investment_portfolio.id = :investmentPortfolioId', { investmentPortfolioId })
            .getOne();

        if (!investmentPortfolio) {
            throw new Error('Portfólio de investimentos não encontrado.');
        }

        return investmentPortfolio;
    }

    async getDateOfFirstTransactionByInvestmentPortfolioId(investmentPortfolioId: string) {
        const investmentPortfolio = await this.investmentPortfolioRepository.createQueryBuilder('investment_portfolio')
            .leftJoinAndSelect('investment_portfolio.transactions', 'transactions')
            .where('investment_portfolio.id = :investmentPortfolioId', { investmentPortfolioId })
            .getOne();

        if (!investmentPortfolio || !investmentPortfolio.transactions || investmentPortfolio.transactions.length === 0) {
            throw new Error('Portfólio de investimentos ou transações não encontrado.');
        }

        const firstTransactionDate = investmentPortfolio.transactions.reduce((earliest, transaction) => {
            const transactionDate = new Date(transaction.transaction_date);
            return earliest < transactionDate ? earliest : transactionDate;
        }, new Date(investmentPortfolio.transactions[0].transaction_date));

        return firstTransactionDate;
    }

    async getTotalAssetsByInvestmentPortfolioId(investmentPortfolioId: string, userId: string, last12Months: boolean = false) {
        try {
            const investmentPortfolio = await this.getTransactionsByInvestmentPortfolioId(investmentPortfolioId);
            if (userId != investmentPortfolio.user.id) {
                throw new Error(`Portfolio not found`);
            }
            const firstTransactionDate = new Date(await this.getDateOfFirstTransactionByInvestmentPortfolioId(investmentPortfolioId));

            const sumTransactionsTotal = (
                transactions: any[],
                final_price: any = undefined
            ) => {
                return transactions
                    .reduce((total, transaction) => {
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

                        if (transaction.asset_type !== 'FIXED_INCOME' && transaction.asset_type !== 'TREASURY') {
                            if (transaction.transaction_type === 'SELL') {
                                return total - (quantity * price_per_unit);
                            }
                            return total + (quantity * originalFinalPrice);
                        }

                        if (transaction.asset_type === 'FIXED_INCOME') {
                            if (transaction.transaction_type === 'SELL') {
                                return total - (amount);
                            }
                            return total + (amount);
                        }

                        if (transaction.asset_type === 'TREASURY') {
                            const currentAmout = transaction.quantity * originalFinalPrice;

                            if (transaction.transaction_type === 'SELL') {
                                return total - currentAmout;
                            }

                            return total + currentAmout;
                        }

                        return total;
                    }, 0);
            };

            const sumTransactionsTotalInvested = (transactions: any[]) => {
                return transactions.reduce((total, transaction) => {
                    const amount = Number(transaction.amount);
                    const quantity = Number(transaction.quantity);
                    const price_per_unit = Number(transaction.price_per_unit);

                    if (transaction.asset_type !== 'FIXED_INCOME' && transaction.asset_type !== 'TREASURY') {
                        if (transaction.transaction_type === 'SELL') {
                            return total - (quantity * price_per_unit);
                        }
                        return total + (quantity * price_per_unit);
                    }

                    if (transaction.asset_type === 'FIXED_INCOME') {
                        if (transaction.transaction_type === 'SELL') {
                            return total - (amount);
                        }
                        return total + (amount);
                    }

                    if (transaction.asset_type === 'TREASURY') {
                        const currentAmout = transaction.quantity * transaction.treasury.unit_price;
                        if (transaction.transaction_type === 'SELL') {
                            return total - (currentAmout);
                        }
                        return total + (currentAmout);
                    }
                }, 0);
            };

            const firstTransactionYear = firstTransactionDate.getFullYear();
            const firstTransactionMonth = firstTransactionDate.getMonth() + 1;

            let totalAssets = undefined;
            if (last12Months) {
                totalAssets = {};
                for (const transaction of investmentPortfolio.transactions) {
                    const isTreasury = transaction.treasury !== null && transaction.treasury !== undefined;
                    const isFixedIncome = transaction.fixed_income_details !== null && transaction.fixed_income_details !== undefined;
                    const isTicker = transaction.ticker !== null && transaction.ticker !== undefined;

                    const historicalQuotesData = isTicker ?
                        await this.historicalQuotesRecordModel.findOne({ tickerId: transaction.ticker.id }) :
                        isTreasury ?
                            await this.historicalTreasuryQuotesRecordModel.findOne({ treasuryId: transaction.treasury.id }) :
                            null;

                    let historicalQuotesObj: any = [];
                    if (historicalQuotesData) {
                        historicalQuotesObj = historicalQuotesData.toObject().quotes.slice(-15);
                    }

                    const last12MonthsArray = this.getLastTwelveMonths();

                    for (const monthYear of last12MonthsArray) {
                        const month = monthYear.month;
                        const year = monthYear.year;
                        if (
                            (year > firstTransactionYear ||
                                (year == firstTransactionYear && month >= firstTransactionMonth)) &&
                            (year > transaction.transaction_date.getFullYear() ||
                                (year == transaction.transaction_date.getFullYear() && month >= transaction.transaction_date.getMonth() + 1))
                        ) {
                            if (isFixedIncome) {
                                const monthYearFormatted = `${year}-${month.toString().padStart(2, '0')}`;
                                const monthReturn = await this.portfolioTransactionsService.calculateIndexProfitabilityByMonth(transaction, monthYearFormatted);

                                if (!totalAssets[`${month}-${year}`]) {
                                    totalAssets[`${month}-${year}`] = { month, year, totalAssets: 0, totalInvested: 0, currency: 'BRL' };
                                }

                                totalAssets[`${month}-${year}`].totalAssets = parseFloat((totalAssets[`${month}-${year}`].totalAssets + monthReturn).toFixed(2));
                            }

                            const monthQuote = historicalQuotesObj.find(
                                (quote: any) => quote.date.slice(0, 7) === `${year}-${month.toString().padStart(2, '0')}`
                            );

                            const monthQuotePrice = monthQuote ? (isTreasury ? monthQuote?.unit_price : monthQuote?.adj_close) : undefined;

                            const currentDate = new Date();
                            const isCurrentMonth = currentDate.getFullYear() === year && currentDate.getMonth() + 1 === month;

                            const monthTotalAssets = sumTransactionsTotal([transaction], isCurrentMonth ? undefined : monthQuotePrice);

                            if (!totalAssets[`${month}-${year}`]) {
                                totalAssets[`${month}-${year}`] = { month, year, totalAssets: 0, totalInvested: 0, currency: 'BRL' };
                            }

                            totalAssets[`${month}-${year}`].totalAssets = parseFloat((totalAssets[`${month}-${year}`].totalAssets + monthTotalAssets).toFixed(2));
                        } else {
                            if (!totalAssets[`${month}-${year}`]) {
                                totalAssets[`${month}-${year}`] = { month, year, totalAssets: 0, totalInvested: 0, currency: 'BRL' };
                            }
                        }
                    }
                }
                for (const monthYear in totalAssets) {
                    const [month, year] = monthYear.split('-');
                    const monthTotalInvested = sumTransactionsTotalInvested(investmentPortfolio.transactions.filter(t => t.transaction_date.getTime() < Date.UTC(parseInt(year), parseInt(month), 1, 3)));
                    totalAssets[`${month}-${year}`].totalInvested = parseFloat((totalAssets[`${month}-${year}`].totalInvested + monthTotalInvested).toFixed(2));
                }
            } else {
                totalAssets = sumTransactionsTotal(investmentPortfolio.transactions);
            }

            return {
                investmentPortfolioId: investmentPortfolio.id,
                totalAssets: typeof totalAssets === 'number' ? parseFloat(totalAssets.toFixed(2)) : Object.values(totalAssets),
                portfolioName: investmentPortfolio.name
            };
        } catch (error) {
            console.error('Error in getTotalAssetsByInvestmentPortfolioId:', error);
            throw new BadRequestException(error)
        }
    }

    async getTotalInvestedByInvestmentPortfolioId(investmentPortfolioId: string, userId: string, last12Months: boolean = false) {
        try {
            const investmentPortfolio = await this.getTransactionsByInvestmentPortfolioId(investmentPortfolioId);
            if (userId != investmentPortfolio.user.id) {
                throw new Error(`Portfolio not found`);
            }

            const totalInvested = investmentPortfolio.transactions.reduce((total, transaction) => {
                const amount = Number(transaction.amount);
                const quantity = Number(transaction.quantity);
                const price_per_unit = Number(transaction.price_per_unit);

                if (transaction.asset_type !== 'FIXED_INCOME' && transaction.asset_type !== 'TREASURY') {
                    if (transaction.transaction_type === 'SELL') {
                        return total - (quantity * price_per_unit);
                    }
                    return total + (quantity * price_per_unit);
                }

                if (transaction.asset_type === 'FIXED_INCOME') {
                    if (transaction.transaction_type === 'SELL') {
                        return total - (amount);
                    }
                    return total + (amount);
                }

                if (transaction.asset_type === 'TREASURY') {
                    if (transaction.transaction_type === 'SELL') {
                        return total - (amount);
                    }
                    return total + (amount);
                }
            }, 0);

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

    async getPortfolioDataByPortfolioId(portfolioId: string, userId: string) {
        const { totalAssets } = await this.getTotalAssetsByInvestmentPortfolioId(portfolioId, userId, true);
        const filteredData = typeof totalAssets === 'number' ? [] : totalAssets.reverse();

        const currentTotalAssets = await this.getTotalAssetsByInvestmentPortfolioId(portfolioId, userId);
        const currentTotalInvested = await this.getTotalInvestedByInvestmentPortfolioId(portfolioId, userId);
        const portfolioDivision = await this.portfolioTransactionsService.getTransactions(portfolioId, false, false)

        return {
            portfolioId: portfolioId,
            historicalData: filteredData,
            currentTotalAssets: currentTotalAssets.totalAssets,
            currentTotalInvested: currentTotalInvested.totalInvested,
            portfolioName: currentTotalAssets.portfolioName,
            portfolioDivision: portfolioDivision,
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
}