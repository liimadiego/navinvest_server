import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InvestmentAssistantModule } from './investment-assistant/investment-assistant.module';
import { ConfigModule } from '@nestjs/config';
import { BacktestModule } from './backtest/backtest.module';
import { InvestTrackModule } from './invest-track/invest-track.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfig, MongoDBConfig } from './config/database';
import { NewsModule } from './news/news.module';
import { CronNewsService } from './cron-news/cron-news.service';
import { CronTotalAssetsService } from './cron-users/portfolio-data/cron-portfolio-data.service';
import { TickerModule } from './ticker/ticker.module';
import { InvestorProfileModule } from './investor-profile/investor-profile.module';
import { TagModule } from './tag/tag.module';
import { CurrencyConverterModule } from './currency-converter/currency-converter.module';
import { UtilsModule } from './utils/utils.module';
import { InvestmentPortfolioModule } from './investment-portfolio/investment-portfolio.module';
import { PortfolioTransactionsModule } from './portfolio-transactions/portfolio-transactions.module';
import { AssetReportAiModule } from './asset-report-ai/asset-report-ai.module';
import { UsersModule } from './users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CompaniesModule } from './companies/companies.module';

@Module({
  controllers: [AppController],
  providers: [AppService, CronNewsService, CronTotalAssetsService],
  imports: [
    TypeOrmModule.forRoot(TypeOrmConfig()),
    MongooseModule.forRoot(...MongoDBConfig()),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    InvestmentAssistantModule,
    BacktestModule,
    InvestTrackModule,
    NewsModule,
    TickerModule,
    InvestorProfileModule,
    TagModule,
    CurrencyConverterModule,
    UtilsModule,
    InvestmentPortfolioModule,
    PortfolioTransactionsModule,
    AssetReportAiModule,
    UsersModule,
    CompaniesModule,
  ],
})
export class AppModule { }
