import { Injectable, NotFoundException } from '@nestjs/common';
import { TickersEntity } from 'entities/tickers.entity';
import { InvestmentPortfolioEntity } from '../entities/investment-portfolio.entity';
import { PortfolioTransactionEntity } from 'entities/portfolio-transaction.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePortfolioTransactionDto } from './dto/create-portfolio-transaction-dto';

@Injectable()
export class PortfolioTransactionsService {
    constructor(
        @InjectRepository(InvestmentPortfolioEntity)
        private readonly investmentPortfolioRepository: Repository<InvestmentPortfolioEntity>,
        @InjectRepository(TickersEntity)
        private readonly tickerRepository: Repository<TickersEntity>,
        @InjectRepository(PortfolioTransactionEntity)
        private readonly portfolioTransactionRepository: Repository<PortfolioTransactionEntity>
    ) { }

    async createTransaction(createDto: CreatePortfolioTransactionDto): Promise<any> {
        const [portfolioExists, tickerExists] = await Promise.all([
            this.investmentPortfolioRepository.exist({ where: { id: createDto.portfolio_id } }),
            this.tickerRepository.exist({ where: { id: createDto.ticker_id } }),
        ]);

        if (!portfolioExists) {
            throw new NotFoundException(`Portfolio with ID ${createDto.portfolio_id} not found`);
        }

        if (!tickerExists) {
            throw new NotFoundException(`Ticker with ID ${createDto.ticker_id} not found`);
        }

        const transaction = this.portfolioTransactionRepository.create({
            portfolio: { id: createDto.portfolio_id },
            ticker: { id: createDto.ticker_id },
            transaction_type: createDto.transaction_type,
            amount: createDto.amount,
            price_per_unit: createDto.price_per_unit,
            transaction_date: createDto.transaction_date || new Date(),
        });

        return this.portfolioTransactionRepository.save(transaction);
    }
}
