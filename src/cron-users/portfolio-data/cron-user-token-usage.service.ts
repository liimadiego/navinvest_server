import { Injectable, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { TokenUsageEntity } from 'entities/token-usage.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';


@Injectable()
export class CronUserTokenUsageService implements OnModuleInit {
    constructor(
        @InjectRepository(TokenUsageEntity)
        private readonly tokenUsageRepository: Repository<TokenUsageEntity>,
    ) { }

    onModuleInit() {
        this.startCronJob();
    }

    private async startCronJob() {
        // cron.schedule('* * * * *', async () => {
        //this.resetUserTokenUsage();
        // });
        // console.log('Cron job agendada.');
    }

    public async resetUserTokenUsage() {
        console.log('Resetando o uso de token dos usuarios...');

        //verifica se é o primeiro dia do mês
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        //se for o primeiro dia do mês, apaga todos os registros de uso de token
        if (currentDate.getDate() === 1) {
            await this.tokenUsageRepository.clear();
            console.log('Todos os registros de uso de token foram apagados.');
        }
    }

}
