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
import { TokenUsageEntity } from 'entities/token-usage.entity';
import { UserEntity } from 'entities/user.entity';
import { FundsEntity } from 'entities/funds.entity';
import { UsersModule } from 'users/users.module';
import { HistoricalFundsQuotesRecord, HistoricalFundsQuotesRecordSchema } from 'schemas/historical-funds-quotes.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: HistoricalFundsQuotesRecord.name, schema: HistoricalFundsQuotesRecordSchema },
    ]),
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
      FundsEntity,
    ]),
  ],
  controllers: [PortfolioTransactionsController],
  providers: [PortfolioTransactionsService, LanguagesService, JwtHelper],
  exports: [PortfolioTransactionsService],
})
export class PortfolioTransactionsModule { }
