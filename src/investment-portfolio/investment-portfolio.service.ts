import { UserEntity } from './../entities/user.entity';
import { Injectable } from '@nestjs/common';
import { InvestmentPortfolioEntity } from '../entities/investment-portfolio.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInvestmentPortfolioDto } from './dto/create-investment-portfolio-dto';

@Injectable()
export class InvestmentPortfolioService {
    constructor(
        @InjectRepository(InvestmentPortfolioEntity)
        private readonly investmentPortfolioRepository: Repository<InvestmentPortfolioEntity>,
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>
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

        const totalAssets = investmentPortfolio.transactions.reduce((total, transaction) => {
            return total + (transaction.quantity * transaction.ticker.current_price);
        }, 0);

        return {
            investmentPortfolioId: investmentPortfolio.id,
            totalAssets: parseFloat(totalAssets.toFixed(2)),
            portfolioName: investmentPortfolio.name,
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
}
