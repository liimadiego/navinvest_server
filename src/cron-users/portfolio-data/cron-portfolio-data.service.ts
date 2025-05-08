import { Injectable, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { InvestmentPortfolioService } from '../../investment-portfolio/investment-portfolio.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class CronTotalAssetsService implements OnModuleInit {
    constructor(
        private readonly InvestmentPortfolioService: InvestmentPortfolioService,
        private readonly UsersService: UsersService,
    ) { }

    onModuleInit() {
        this.startCronJob();
    }

    private async startCronJob() {
        // cron.schedule('* * * * *', async () => {
        //this.saveTotalAssetsOfThisMonth();
        // });
        // console.log('Cron job agendada.');
        // this.saveTotalAssetsOfThisMonth();
    }

    async saveTotalAssetsOfThisMonth() {
        console.log('Salvando ativos totais do mes atual...');
        const users = await this.UsersService.getAllUsersWithInvestmentPortfolio();

        for (const user of users) {
            for (const portfolio of user.portfolios) {
                const totalAssets = await this.InvestmentPortfolioService.getTotalAssetsByInvestmentPortfolioId(portfolio.id, user.id);
                const totalInvested = await this.InvestmentPortfolioService.getTotalInvestedByInvestmentPortfolioId(portfolio.id, user.id);

                const savedPortfolio = await this.savePortfolioData(portfolio.id, totalAssets.totalAssets, totalInvested.totalInvested, "BRL");

                console.log(`Salvando ativos totais do portfolio ${portfolio.name} do usuario ${user.full_name} (${user.id})`);
                console.log(savedPortfolio);
            }
        }
    }

    private async savePortfolioData(portfolioId: string, totalAssets: number, totalInvested: number, currency: string = 'BRL') {
        const currentDate = new Date();
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();

        const totalAssetsRecord = await this.InvestmentPortfolioService.insertOrUpdatePortfolioDataRecord(portfolioId, {
            month: month.toString(),
            year: year.toString(),
            totalAssets,
            totalInvested,
            currency
        });

        return totalAssetsRecord;
    }

}
