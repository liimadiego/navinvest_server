import { Module } from '@nestjs/common';
import { CronUserTokenUsageService } from './cron-user-token-usage.service';
import { TokenUsageEntity } from 'entities/token-usage.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [
        TypeOrmModule.forFeature([TokenUsageEntity]),
    ],
    providers: [CronUserTokenUsageService],
})
export class CronUserTokenUsageModule { }
