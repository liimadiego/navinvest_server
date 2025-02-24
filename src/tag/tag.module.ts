import { Module } from '@nestjs/common';
import { TagService } from './tag.service';
import { TagController } from './tag.controller';
import { TagEntity } from 'src/entities/tag.entity';
import { TickersEntity } from 'src/entities/tickers.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TagEntity,
      TickersEntity,
    ]),
  ],
  controllers: [TagController],
  providers: [TagService],
})
export class TagModule { }
