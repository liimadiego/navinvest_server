import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InvestmentAssistantModule } from './investment-assistant/investment-assistant.module';
import { ConfigModule } from '@nestjs/config';
import { BacktestModule } from './backtest/backtest.module';
import { InvestTrackModule } from './invest-track/invest-track.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfig } from './config/database';
import { NewsModule } from './news/news.module';
import { CronNewsService } from './cron-news/cron-news.service';
import { TickerModule } from './ticker/ticker.module';
import { InvestorProfileModule } from './investor-profile/investor-profile.module';

@Module({
  controllers: [AppController],
  providers: [AppService, CronNewsService],
  imports: [
    TypeOrmModule.forRoot(TypeOrmConfig()),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    InvestmentAssistantModule,
    BacktestModule,
    InvestTrackModule,
    NewsModule,
    TickerModule,
    InvestorProfileModule,
  ],
})
export class AppModule { }
