import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { NewsEntity } from 'src/entities/news.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TickersEntity } from 'src/entities/tickers.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TickersEntity,
      NewsEntity,
    ]),
  ],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule { }
