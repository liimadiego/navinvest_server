import { UserEntity } from './../entities/user.entity';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvestmentPortfolioEntity } from '../entities/investment-portfolio.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInvestmentPortfolioDto } from './dto/create-investment-portfolio-dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PortfolioDataRecord, PortfolioDataRecordDocument } from '../schemas/portfolio-data-record.schema';
import { LanguagesService } from 'utils/language.service';
import { PortfolioTransactionsService } from 'portfolio-transactions/portfolio-transactions.service';
import { JwtService } from '@nestjs/jwt';
import {
    HistoricalQuotesRecord,
    HistoricalQuotesRecordDocument
} from '../schemas/historical-quotes.schema';

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

    async getTotalAssetsByInvestmentPortfolioId(investmentPortfolioId: string, userId: string, last12Months: boolean = false) {
        try {
            const investmentPortfolio = await this.getTransactionsByInvestmentPortfolioId(investmentPortfolioId);
            if (userId != investmentPortfolio.user.id) {
                throw new Error(`Portfolio not found`);
            }

            console.log('investmentPortfolio.transactions:', investmentPortfolio.transactions, '\n ')

            const sumTransactionsTotal = (transactions: any[], final_price: any = undefined) => {
                return transactions.reduce((total, transaction) => {
                    const amount = Number(transaction.amount);
                    const quantity = Number(transaction.quantity);
                    const price_per_unit = Number(transaction.price_per_unit);

                    if (final_price === undefined)
                        final_price = transaction.ticker ? Number(transaction.ticker.current_price) : 0;

                    if (transaction.asset_type !== 'FIXED_INCOME' && transaction.asset_type !== 'TREASURY') {
                        if (transaction.transaction_type === 'SELL') {
                            return total - (quantity * price_per_unit);
                        }
                        return total + (quantity * final_price);
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
                        if (transaction.transaction_type === 'SELL') {
                            return total - (amount);
                        }
                        return total + (amount);
                    }
                }, 0);
            };

            let totalAssets = undefined;
            if (last12Months) {
                // {
                //     month: month.toString(),
                //     year: year.toString(),
                //     totalAssets,
                //     totalInvested,
                //     currency
                // }
                totalAssets = {};
                for (const transaction of investmentPortfolio.transactions) {
                    const historicalQuotesData = await this.historicalQuotesRecordModel.findOne({ tickerId: transaction.ticker.id });
                    let historicalQuotesObj: any = [];
                    if (historicalQuotesData) {
                        historicalQuotesObj = historicalQuotesData.toObject().quotes.slice(-12);
                    }

                    for (const monthQuote of historicalQuotesObj) {
                        const [ year, month ] = monthQuote.date.split('-');
                        const monthTotalAssets = sumTransactionsTotal([ transaction ], monthQuote.adj_close);
                        
                        if (!totalAssets[`${month}-${year}`]) {
                            totalAssets[`${month}-${year}`] = { month, year, totalAssets: 0, totalInvested: 0, currency: 'BRL' };
                        }

                        totalAssets[`${month}-${year}`].totalAssets = parseFloat((totalAssets[`${month}-${year}`].totalAssets + monthTotalAssets).toFixed(2));
                    }
                }
                for (const monthYear in totalAssets) {
                    const [ month, year ] = monthYear.split('-');
                    const monthTotalInvested = sumTransactionsTotalInvested(investmentPortfolio.transactions.filter(t => t.transaction_date.getTime() < Date.UTC(parseInt(year), parseInt(month), 1, 3)));
                    totalAssets[`${month}-${year}`].totalInvested = parseFloat((totalAssets[`${month}-${year}`].totalInvested + monthTotalInvested).toFixed(2));
                }
                

            } else {
                totalAssets = sumTransactionsTotal(investmentPortfolio.transactions); //transaction.ticker ? Number(transaction.ticker.current_price) : 0;
            }

            return {
                investmentPortfolioId: investmentPortfolio.id,
                totalAssets: typeof totalAssets === 'number' ? parseFloat(totalAssets.toFixed(2)) : Object.values(totalAssets),
                portfolioName: investmentPortfolio.name
            };
        } catch (error) {
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
        // const portfolioDataRecord = await this.portfolioDataRecordModel.findOne({ portfolioId });
        // let data = [];
        // let filteredData = [];
        // if (portfolioDataRecord) {
        //     data = portfolioDataRecord.data;
        //     const currentDate = new Date();
        //     const twelveMonthsAgo = new Date(currentDate.setMonth(currentDate.getMonth() - 12));
        //     filteredData = data.filter((d: any) => {
        //         const recordDate = new Date(d.year, d.month - 1, 1);
        //         return recordDate >= twelveMonthsAgo;
        //     });
        // }
        
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
}