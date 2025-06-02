import { Injectable, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { IsNull, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../../entities/user.entity';


@Injectable()
export class CronUserSubscriptionService implements OnModuleInit {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
    ) { }

    onModuleInit() {
        this.startCronJob();
    }

    private async startCronJob() {
        // cron.schedule('* * * * *', async () => {
        // this.verifyUserSubscriptions();
        // });
        // console.log('Cron job agendada.');
    }

    public async verifyUserSubscriptions() {
        console.log('Verificando assinaturas de usuários...');

        const users = await this.userRepository.find();

        //filtra os que estao com checkout_subscription_status = OVERDUE
        const overdueUsers = users.filter(user => user.checkoutSubscriptionStatus === 'OVERDUE');

        console.log(`Total de usuários encontrados: ${users.length}`);
        console.log(`Total de usuários com assinatura vencida: ${overdueUsers.length}`);

        if (overdueUsers.length > 0) {
            console.log(`Encontrados ${overdueUsers.length} usuários com assinatura vencida.`);
            for (const user of overdueUsers) {
                console.log(`Usuário: ${user.email}, Assinatura: ${user.checkoutSubscriptionStatus}`);


            }
        }
    }

}
