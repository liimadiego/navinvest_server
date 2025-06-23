import { Module } from '@nestjs/common';
import { InvestmentAssistantService } from './investment-assistant.service';
import { InvestmentAssistantController } from './investment-assistant.controller';
import { TickerModule } from 'ticker/ticker.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TickersEntity } from '../entities/tickers.entity';
import { TagEntity } from 'entities/tag.entity';
import { TreasuriesEntity } from 'entities/treasuries.entity';
import { CompanyEntity } from '../entities/companies.entity';
import { CompaniesModule } from 'companies/companies.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyDataRecord, CompanyDataRecordSchema } from '../schemas/company-data-record.schema';
import { EconomicIndexesEntity } from 'entities/economic-indexes.entity';
import { HistoricalQuotesRecord, HistoricalQuotesRecordSchema } from '../schemas/historical-quotes.schema';
import { HistoricalDividendYieldRecord, HistoricalDividendYieldRecordSchema } from 'schemas/historical-dividend-yield.schema';
import { DividendEntity } from 'entities/dividends.entity';
import { UserEntity } from 'entities/user.entity';
import { TokenUsageEntity } from 'entities/token-usage.entity';
import { BacktestService } from 'backtest/backtest.service';
import { InvestmentAssistantChatRecord, InvestmentAssistantChatRecordSchema } from 'schemas/investment-assistant-chat.schema';
import { UsersModule } from 'users/users.module';
import { InvestmentPortfolioModule } from 'investment-portfolio/investment-portfolio.module';

@Module({
  imports: [
    CompaniesModule,
    TickerModule,
    UsersModule,
    InvestmentPortfolioModule,
    TypeOrmModule.forFeature([TickersEntity, TagEntity, TreasuriesEntity, CompanyEntity, EconomicIndexesEntity, DividendEntity, UserEntity, TokenUsageEntity]),
    MongooseModule.forFeature([
      { name: CompanyDataRecord.name, schema: CompanyDataRecordSchema },
      { name: HistoricalQuotesRecord.name, schema: HistoricalQuotesRecordSchema },
      { name: HistoricalDividendYieldRecord.name, schema: HistoricalDividendYieldRecordSchema },
      { name: InvestmentAssistantChatRecord.name, schema: InvestmentAssistantChatRecordSchema }
    ]),
  ],
  controllers: [InvestmentAssistantController],
  providers: [InvestmentAssistantService, BacktestService],
  exports: [InvestmentAssistantService]
})
export class InvestmentAssistantModule { }
