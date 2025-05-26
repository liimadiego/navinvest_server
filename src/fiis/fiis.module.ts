import { Module } from '@nestjs/common';
import { FiisController } from './fiis.controller';
import { FiisService } from './fiis.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FiisData, FiisDataSchema } from '../schemas/fiis-data.schema';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TickersEntity } from 'entities/tickers.entity';
import { DividendEntity } from 'entities/dividends.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FiisData.name, schema: FiisDataSchema },
    ]),
    TypeOrmModule.forFeature([
      TickersEntity,
      DividendEntity,
    ]),
  ],
  controllers: [ FiisController ],
  providers: [ FiisService ]
})
export class FiisModule {};