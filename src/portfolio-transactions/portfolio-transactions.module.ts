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
import { EconomicIndexesEntity } from 'entities/economic-indexes.entity';
import { FinancialHolidaysEntity } from 'entities/financial-holidays.entity';
import { JwtHelper } from 'utils/jwt.service';
import { UsersService } from 'users/users.service';
import { TokenUsageEntity } from 'entities/token-usage.entity';
import { UserEntity } from 'entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvestmentPortfolioEntity,
      TickersEntity,
      PortfolioTransactionEntity,
      FixedIncomeDetailsEntity,
      TreasuriesEntity,
      EconomicIndexesEntity,
      FinancialHolidaysEntity,
      TokenUsageEntity,
      UserEntity,
    ]),
  ],
  controllers: [PortfolioTransactionsController],
  providers: [PortfolioTransactionsService, LanguagesService, JwtHelper, UsersService],
  exports: [PortfolioTransactionsService],
})
export class PortfolioTransactionsModule { }
