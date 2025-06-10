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

            const transactions = investmentPortfolio.transactions
                .filter(t => t.asset_type !== 'FIXED_INCOME') // WIP: Renda fixa
                .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

            const months = last12Months ? this.getLastTwelveMonths() : [{ month: new Date().getMonth() + 1, year: new Date().getFullYear() }];

            const tickerQuotes: Record<string, Record<string, number>> = {};
            const treasuryQuotes: Record<string, Record<string, number>> = {};

            for (const t of transactions) {
                if (t.ticker && !tickerQuotes[t.ticker.id]) {
                    const data = await this.historicalQuotesRecordModel.findOne({ tickerId: t.ticker.id });
                    const quotes: Record<string, number> = {};
                    if (data && data.quotes) {
                        for (const q of data.quotes.slice(-15)) {
                            quotes[q.date.slice(0, 7)] = q.adj_close;
                        }
                    }
                    tickerQuotes[t.ticker.id] = quotes;
                }

                if (t.treasury && !treasuryQuotes[t.treasury.id]) {
                    const data = await this.historicalTreasuryQuotesRecordModel.findOne({ treasuryId: t.treasury.id });
                    const quotes: Record<string, number> = {};
                    if (data && data.quotes) {
                        for (const q of data.quotes.slice(-15)) {
                            quotes[q.date.slice(0, 7)] = q.unit_price;
                        }
                    }
                    treasuryQuotes[t.treasury.id] = quotes;
                }
            }

            const holdings: Record<string, { qty: number; info: any }> = {};
            const monthlyResults: any[] = [];
            let txIndex = 0;

            for (const m of months) {
                const monthStart = new Date(Date.UTC(m.year, m.month - 1, 1, 3));
                const monthEnd = new Date(Date.UTC(m.year, m.month, 0, 23, 59, 59));

                while (txIndex < transactions.length && new Date(transactions[txIndex].transaction_date).getTime() <= monthEnd.getTime()) {
                    const tr = transactions[txIndex];
                    const key = tr.ticker ? `T-${tr.ticker.id}` : `TR-${tr.treasury.id}`;
                    let qty = tr.asset_type === 'TREASURY' ? Number(tr.amount) / Number(tr.price_per_unit) : Number(tr.quantity);
                    if (tr.transaction_type === 'SELL') qty = -qty;
                    if (!holdings[key]) holdings[key] = { qty: 0, info: tr };
                    holdings[key].qty += qty;
                    txIndex++;
                }

                let total = 0;
                for (const key in holdings) {
                    const h = holdings[key];
                    if (h.qty <= 0) continue;
                    let price = 0;
                    const monthKey = `${m.year}-${String(m.month).padStart(2, '0')}`;
                    if (h.info.ticker) {
                        price = tickerQuotes[h.info.ticker.id][monthKey] ?? Number(h.info.ticker.current_price);
                    } else if (h.info.treasury) {
                        price = treasuryQuotes[h.info.treasury.id][monthKey] ?? Number(h.info.treasury.unit_price);
                    }
                    total += h.qty * price;
                }

                const invested = transactions
                    .filter(t => new Date(t.transaction_date).getTime() < monthStart.getTime())
                    .reduce((acc, t) => {
                        const amount = Number(t.amount);
                        const quantity = Number(t.quantity);
                        const price_per_unit = Number(t.price_per_unit);

                        if (t.asset_type === 'TREASURY') {
                            if (t.transaction_type === 'SELL') return acc - amount;
                            return acc + amount;
                        }

                        if (t.transaction_type === 'SELL') return acc - quantity * price_per_unit;
                        return acc + quantity * price_per_unit;
                    }, 0);

                monthlyResults.push({
                    month: m.month,
                    year: m.year,
                    totalAssets: parseFloat(total.toFixed(2)),
                    totalInvested: parseFloat(invested.toFixed(2)),
                    currency: 'BRL'
                });
            }

            if (last12Months) {
                return {
                    investmentPortfolioId: investmentPortfolio.id,
                    totalAssets: monthlyResults,
                    portfolioName: investmentPortfolio.name,
                };
            }

            const current = monthlyResults[monthlyResults.length - 1] || { totalAssets: 0 };
            return {
                investmentPortfolioId: investmentPortfolio.id,
                totalAssets: current.totalAssets,
                portfolioName: investmentPortfolio.name,
            };
        } catch (error) {
            console.error('Error in getTotalAssetsByInvestmentPortfolioId:', error);
            throw new BadRequestException(error);
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

        console.log('currentTotalAssets', currentTotalAssets);

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