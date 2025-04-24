import { Module } from '@nestjs/common';
import { PortfolioTransactionsService } from './portfolio-transactions.service';
import { PortfolioTransactionsController } from './portfolio-transactions.controller';
import { InvestmentPortfolioEntity } from '../entities/investment-portfolio.entity';
import { PortfolioTransactionEntity } from 'entities/portfolio-transaction.entity';
import { TickersEntity } from 'entities/tickers.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LanguagesService } from 'utils/language.service';
import { FixedIncomeDetailsEntity } from 'entities/fixed-income-details.entity';
import { TreasuriesEntity } from 'entities/treasuries.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvestmentPortfolioEntity,
      TickersEntity,
      PortfolioTransactionEntity,
      FixedIncomeDetailsEntity,
      TreasuriesEntity,
    ]),
  ],
  controllers: [PortfolioTransactionsController],
  providers: [PortfolioTransactionsService, LanguagesService],
  exports: [PortfolioTransactionsService],
})
export class PortfolioTransactionsModule { }
