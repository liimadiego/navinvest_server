import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InvestmentAssistantModule } from './investment-assistant/investment-assistant.module';
import { ConfigModule } from '@nestjs/config';
import { BacktestModule } from './backtest/backtest.module';
import { InvestTrackModule } from './invest-track/invest-track.module';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    InvestmentAssistantModule,
    BacktestModule,
    InvestTrackModule
  ],
})
export class AppModule { }
