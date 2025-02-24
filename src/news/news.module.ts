import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { NewsEntity } from 'src/entities/news.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TickersEntity } from 'src/entities/tickers.entity';
import { UserEntity } from 'src/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TickersEntity,
      NewsEntity,
      UserEntity,
    ]),
  ],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule { }
