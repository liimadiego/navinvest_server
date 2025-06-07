import { Module } from '@nestjs/common';
import { BdrsService } from './bdrs.service';
import { BdrsController } from './bdrs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BdrEntity } from '../entities/bdrs.entity';
import { TickersEntity } from '../entities/tickers.entity';
import { HistoricalQuotesRecord, HistoricalQuotesRecordSchema } from 'schemas/historical-quotes.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    TypeOrmModule.forFeature([BdrEntity, TickersEntity]),
    MongooseModule.forFeature([
      { name: HistoricalQuotesRecord.name, schema: HistoricalQuotesRecordSchema },
    ]),
  ],
  controllers: [BdrsController],
  providers: [BdrsService],
  exports: [BdrsService],
})
export class BdrsModule { }
