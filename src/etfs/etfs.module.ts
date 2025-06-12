import { Module } from '@nestjs/common';
import { EtfsService } from './etfs.service';
import { EtfsController } from './etfs.controller';
import { HistoricalQuotesRecord, HistoricalQuotesRecordSchema } from 'schemas/historical-quotes.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { TickersEntity } from 'entities/tickers.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([TickersEntity]),
    MongooseModule.forFeature([
      { name: HistoricalQuotesRecord.name, schema: HistoricalQuotesRecordSchema },
    ]),
  ],
  controllers: [EtfsController],
  providers: [EtfsService],
  exports: [EtfsService],
})
export class EtfsModule { }
