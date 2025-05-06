import { Module } from '@nestjs/common';
import { TickerService } from './ticker.service';
import { TickerController } from './ticker.controller';
import { TagEntity } from '../entities/tag.entity';
import { TickersEntity } from '../entities/tickers.entity';
import { TreasuriesEntity } from 'entities/treasuries.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { LanguagesService } from '../utils/language.service';
import { EconomicIndexesEntity } from 'entities/economic-indexes.entity';
import { HistoricalQuotesRecord, HistoricalQuotesRecordSchema } from 'schemas/historical-quotes.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HistoricalQuotesRecord.name, schema: HistoricalQuotesRecordSchema },
    ]),
    TypeOrmModule.forFeature([
      TickersEntity,
      TagEntity,
      TreasuriesEntity,
      EconomicIndexesEntity,
    ]),
  ],
  controllers: [TickerController],
  providers: [TickerService, LanguagesService],
  exports: [TickerService],
})
export class TickerModule { }
