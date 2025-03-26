import { Module } from '@nestjs/common';
import { PortfolioTransactionsService } from './portfolio-transactions.service';
import { PortfolioTransactionsController } from './portfolio-transactions.controller';
import { InvestmentPortfolioEntity } from '../entities/investment-portfolio.entity';
import { PortfolioTransactionEntity } from 'entities/portfolio-transaction.entity';
import { TickersEntity } from 'entities/tickers.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvestmentPortfolioEntity,
      TickersEntity,
      PortfolioTransactionEntity
    ]),
  ],
  controllers: [PortfolioTransactionsController],
  providers: [PortfolioTransactionsService],
})
export class PortfolioTransactionsModule { }
