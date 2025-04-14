import { Module } from '@nestjs/common';
import { CronTotalAssetsService } from './cron-portfolio-data.service';
import { InvestmentPortfolioService } from 'investment-portfolio/investment-portfolio.service';
import { UsersService } from 'users/users.service';

@Module({
    imports: [
        InvestmentPortfolioService,
        UsersService,
    ],
    providers: [CronTotalAssetsService],
})
export class CronTotalAssetsModule { }
