import { Module } from '@nestjs/common';
import { CronNewsService } from './cron-news.service';
import { NewsEntity } from 'src/entities/news.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TickerService } from 'src/ticker/ticker.service';
import { NewsService } from 'src/news/news.service';

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
export class NewsModule { }
