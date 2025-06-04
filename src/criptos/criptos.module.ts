import { Module } from '@nestjs/common';
import { CriptosService } from './criptos.service';
import { CriptosController } from './criptos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CriptoEntity } from '../entities/criptos.entity';
import { HistoricalQuotesRecord, HistoricalQuotesRecordSchema } from 'schemas/historical-quotes.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { TickersEntity } from 'entities/tickers.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CriptoEntity, TickersEntity]),
    MongooseModule.forFeature([
      { name: HistoricalQuotesRecord.name, schema: HistoricalQuotesRecordSchema },
    ]),
  ],
  controllers: [CriptosController],
  providers: [CriptosService],
  exports: [CriptosService],
})
export class CriptosModule { }
