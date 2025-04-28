import { Module } from '@nestjs/common';
import { TickerService } from './ticker.service';
import { TickerController } from './ticker.controller';
import { TagEntity } from '../entities/tag.entity';
import { TickersEntity } from '../entities/tickers.entity';
import { TreasuriesEntity } from 'entities/treasuries.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LanguagesService } from '../utils/language.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TickersEntity,
      TagEntity,
      TreasuriesEntity,
    ]),
  ],
  controllers: [TickerController],
  providers: [TickerService, LanguagesService],
  exports: [TickerService],
})
export class TickerModule { }
