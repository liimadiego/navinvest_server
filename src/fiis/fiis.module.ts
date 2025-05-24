import { Module } from '@nestjs/common';
import { FiisController } from './fiis.controller';
import { FiisService } from './fiis.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FiisData, FiisDataSchema } from '../schemas/fiis-data.schema';
import { TickersEntity } from 'entities/tickers.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FiisData.name, schema: FiisDataSchema },
    ]),
    TypeOrmModule.forFeature([
      TickersEntity,
    ]),
  ],
  controllers: [ FiisController ],
  providers: [ FiisService ]
})
export class FiisModule {};