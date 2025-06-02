import { Module } from '@nestjs/common';
import { CronUserSubscriptionService } from './cron-user-subscription.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity]),
    ],
    providers: [CronUserSubscriptionService],
})
export class CronUserSubscriptionModule { }
