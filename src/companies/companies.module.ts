import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyEntity } from '../entities/companies.entity';
import { TickersEntity } from 'entities/tickers.entity';
import { DividendEntity } from 'entities/dividends.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyDataRecord, CompanyDataRecordSchema } from '../schemas/company-data-record.schema';
import { StockDataRecord, StockDataRecordSchema } from '../schemas/stock-data-record.schema';
import { HistoricalDividendYieldRecord, HistoricalDividendYieldRecordSchema } from '../schemas/historical-dividend-yield.schema';
import { HistoricalQuotesRecord, HistoricalQuotesRecordSchema } from 'schemas/historical-quotes.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompanyDataRecord.name, schema: CompanyDataRecordSchema },
      { name: HistoricalDividendYieldRecord.name, schema: HistoricalDividendYieldRecordSchema },
      { name: HistoricalQuotesRecord.name, schema: HistoricalQuotesRecordSchema },
      { name: StockDataRecord.name, schema: StockDataRecordSchema },
    ]),
    TypeOrmModule.forFeature([
      CompanyEntity,
      TickersEntity,
      DividendEntity,
    ]),
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule { }
