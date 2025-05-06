import { Module } from '@nestjs/common';
import { InvestmentAssistantService } from './investment-assistant.service';
import { InvestmentAssistantController } from './investment-assistant.controller';
import { TickerService } from '../ticker/ticker.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TickersEntity } from '../entities/tickers.entity';
import { TagEntity } from 'entities/tag.entity';
import { TreasuriesEntity } from 'entities/treasuries.entity';
import { CompanyEntity } from '../entities/companies.entity';
import { CompaniesService } from 'companies/companies.service';
import { MongooseModule } from '@nestjs/mongoose';
import { StockDataRecord, StockDataRecordSchema } from '../schemas/stock-data-record.schema';
import { EconomicIndexesEntity } from 'entities/economic-indexes.entity';
import { HistoricalQuotesRecord, HistoricalQuotesRecordSchema } from '../schemas/historical-quotes.schema';
import { HistoricalDividendYieldRecord, HistoricalDividendYieldRecordSchema } from 'schemas/historical-dividend-yield.schema';
import { DividendEntity } from 'entities/dividends.entity';
import { BacktestService } from 'backtest/backtest.service';

@Module({
  imports: [ 
    TypeOrmModule.forFeature([ TickersEntity, TagEntity, TreasuriesEntity, CompanyEntity, EconomicIndexesEntity, DividendEntity ]),
    MongooseModule.forFeature([
      { name: StockDataRecord.name, schema: StockDataRecordSchema },
      { name: HistoricalQuotesRecord.name, schema: HistoricalQuotesRecordSchema },
      { name: HistoricalDividendYieldRecord.name, schema: HistoricalDividendYieldRecordSchema },
    ]),
   ],
  controllers: [InvestmentAssistantController],
  providers: [InvestmentAssistantService, TickerService, CompaniesService, BacktestService],
  exports: [InvestmentAssistantService]
})
export class InvestmentAssistantModule { }
