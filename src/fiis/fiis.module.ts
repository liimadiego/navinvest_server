import { Module } from '@nestjs/common';
import { FiisController } from './fiis.controller';
import { FiisService } from './fiis.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FiisData, FiisDataSchema } from '../schemas/fiis-data.schema';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TickersEntity } from 'entities/tickers.entity';
import { DividendEntity } from 'entities/dividends.entity';
import { HistoricalQuotesRecord, HistoricalQuotesRecordSchema } from 'schemas/historical-quotes.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FiisData.name, schema: FiisDataSchema },
      { name: HistoricalQuotesRecord.name, schema: HistoricalQuotesRecordSchema },
    ]),
    TypeOrmModule.forFeature([
      TickersEntity,
      DividendEntity,
    ]),
  ],
  controllers: [FiisController],
  providers: [FiisService],
  exports: [FiisService],
})
export class FiisModule { };