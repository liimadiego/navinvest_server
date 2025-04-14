import { Module } from '@nestjs/common';
import { CronNewsService } from './cron-news.service';
import { NewsEntity } from '../entities/news.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TickerService } from '../ticker/ticker.service';
import { NewsService } from '../news/news.service';

@Module({
  imports: [
    NewsService,
    TickerService,
    TypeOrmModule.forFeature([
      NewsEntity,
    ]),
  ],
  providers: [CronNewsService],
})
export class CronNewsModule { }
