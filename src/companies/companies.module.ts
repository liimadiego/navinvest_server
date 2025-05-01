import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyEntity } from '../entities/companies.entity';
import { TickersEntity } from 'entities/tickers.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { StockDataRecord, StockDataRecordSchema } from '../schemas/stock-data-record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StockDataRecord.name, schema: StockDataRecordSchema }]),
    TypeOrmModule.forFeature([
      CompanyEntity,
      TickersEntity,
    ]),
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule { }
