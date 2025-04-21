import { UserEntity } from './../entities/user.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InvestmentPortfolioEntity } from '../entities/investment-portfolio.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInvestmentPortfolioDto } from './dto/create-investment-portfolio-dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PortfolioDataRecord, PortfolioDataRecordDocument } from '../schemas/portfolio-data-record.schema';
import { LanguagesService } from 'utils/language.service';
import { PortfolioTransactionsService } from 'portfolio-transactions/portfolio-transactions.service';

@Injectable()
export class InvestmentPortfolioService {
    constructor(
        @InjectRepository(InvestmentPortfolioEntity)
        private readonly investmentPortfolioRepository: Repository<InvestmentPortfolioEntity>,
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        @InjectModel(PortfolioDataRecord.name)
        private portfolioDataRecordModel: Model<PortfolioDataRecordDocument>,
        private readonly languagesService: LanguagesService,
        private readonly portfolioTransactionsService: PortfolioTransactionsService,
    ) { }

    async create(investmentPortfolio: CreateInvestmentPortfolioDto) {
        const user_id = investmentPortfolio.userId;

        const user = await this.userRepository.createQueryBuilder('user')
            .where('user.id = :user_id', { user_id })
            .getOne();

        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        const newInvestmentPortfolio = await this.investmentPortfolioRepository.save({ ...investmentPortfolio, user });

        if (!newInvestmentPortfolio) {
            throw new Error('Erro ao criar portfólio de investimentos.');
        }

        const investmentPortfolios = await this.findByUserId(user_id);

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
            .leftJoinAndSelect('investment_portfolio.transactions', 'transactions')
            .leftJoinAndSelect('transactions.ticker', 'ticker')
            .where('investment_portfolio.id = :investmentPortfolioId', { investmentPortfolioId })
            .getOne();

        if (!investmentPortfolio) {
            throw new Error('Portfólio de investimentos não encontrado.');
        }

        return investmentPortfolio;
    }

    async getTotalAssetsByInvestmentPortfolioId(investmentPortfolioId: string) {
        const investmentPortfolio = await this.getTransactionsByInvestmentPortfolioId(investmentPortfolioId);

        //MEXER AQUI (ADAPTAR PARA O NOVO MODELO DE DADOS)
        const totalAssets = investmentPortfolio.transactions.reduce((total, transaction) => {
            if (transaction.asset_type !== 'FIXED_INCOME' && transaction.asset_type !== 'TREASURY') {
                if (transaction.transaction_type === 'SELL') {
                    return total - (transaction.quantity * transaction.price_per_unit);
                }
                return total + (transaction.quantity * transaction.ticker.current_price);
            }

            return total;
        }, 0);

        return {
            investmentPortfolioId: investmentPortfolio.id,
            totalAssets: parseFloat(totalAssets.toFixed(2)),
            portfolioName: investmentPortfolio.name
        };
    }

    async getTotalInvestedByInvestmentPortfolioId(investmentPortfolioId: string) {
        const investmentPortfolio = await this.getTransactionsByInvestmentPortfolioId(investmentPortfolioId);

        const totalInvested = investmentPortfolio.transactions.reduce((total, transaction) => {
            return total + (transaction.quantity * transaction.price_per_unit);
        }, 0);

        return {
            investmentPortfolioId: investmentPortfolio.id,
            totalInvested: parseFloat(totalInvested.toFixed(2)),
            portfolioName: investmentPortfolio.name,
        };
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

    async getPortfolioDataByPortfolioId(portfolioId: string) {
        const portfolioDataRecord = await this.portfolioDataRecordModel.findOne({
            portfolioId: portfolioId
        });

        if (!portfolioDataRecord) {
            return {
                portfolioId: portfolioId,
                historicalData: [],
                currentTotalAssets: 0,
                currentTotalInvested: 0,
                portfolioName: ''
            };
        }

        const data = portfolioDataRecord.data;
        const currentDate = new Date();
        const twelveMonthsAgo = new Date(currentDate.setMonth(currentDate.getMonth() - 12));
        const filteredData = data.filter((d: any) => {
            const recordDate = new Date(d.year, d.month - 1, 1);
            return recordDate >= twelveMonthsAgo;
        });

        const currentTotalAssets = await this.getTotalAssetsByInvestmentPortfolioId(portfolioId);
        const currentTotalInvested = await this.getTotalInvestedByInvestmentPortfolioId(portfolioId);
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

}