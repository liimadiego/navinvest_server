import { Module } from '@nestjs/common';
import { InvestmentPortfolioService } from './investment-portfolio.service';
import { InvestmentPortfolioController } from './investment-portfolio.controller';
import { UserEntity } from 'entities/user.entity';
import { InvestmentPortfolioEntity } from '../entities/investment-portfolio.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { PortfolioDataRecord, PortfolioDataRecordSchema } from '../schemas/portfolio-data-record.schema';
import { LanguagesService } from 'utils/language.service';
import { PortfolioTransactionsService } from 'portfolio-transactions/portfolio-transactions.service';
import { TickersEntity } from 'entities/tickers.entity';
import { PortfolioTransactionEntity } from 'entities/portfolio-transaction.entity';
import { FixedIncomeDetailsEntity } from 'entities/fixed-income-details.entity';
import { TreasuriesEntity } from 'entities/treasuries.entity';
import { EconomicIndexesEntity } from 'entities/economic-indexes.entity';
import { FinancialHolidaysEntity } from 'entities/financial-holidays.entity';
import { UsersService } from 'users/users.service';
import { TokenUsageEntity } from 'entities/token-usage.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PortfolioDataRecord.name, schema: PortfolioDataRecordSchema }]),
    TypeOrmModule.forFeature([
      InvestmentPortfolioEntity,
      TickersEntity,
      PortfolioTransactionEntity,
      FixedIncomeDetailsEntity,
      TreasuriesEntity,
      EconomicIndexesEntity,
      FinancialHolidaysEntity,
      UserEntity,
      TokenUsageEntity,
    ]),
  ],
  controllers: [InvestmentPortfolioController],
  providers: [InvestmentPortfolioService, LanguagesService, PortfolioTransactionsService, UsersService],
  exports: [InvestmentPortfolioService],
})
export class InvestmentPortfolioModule { }
