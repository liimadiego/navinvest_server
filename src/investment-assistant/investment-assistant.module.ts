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

@Module({
  imports: [ 
    TypeOrmModule.forFeature([ TickersEntity, TagEntity, TreasuriesEntity, CompanyEntity ]),
    MongooseModule.forFeature([
      { name: StockDataRecord.name, schema: StockDataRecordSchema }]),
   ],
  controllers: [InvestmentAssistantController],
  providers: [InvestmentAssistantService, TickerService, CompaniesService],
  exports: [InvestmentAssistantService]
})
export class InvestmentAssistantModule { }
