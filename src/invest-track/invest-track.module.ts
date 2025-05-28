import { Module } from '@nestjs/common';
import { InvestTrackService } from './invest-track.service';
import { InvestTrackController } from './invest-track.controller';
import { JwtHelper } from 'utils/jwt.service';
import { UsersModule } from 'users/users.module';
import { UserEntity } from 'entities/user.entity';
import { TokenUsageEntity } from 'entities/token-usage.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanEntity } from 'entities/plan.entity';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([UserEntity, TokenUsageEntity, PlanEntity]),
  ],
  controllers: [InvestTrackController],
  providers: [InvestTrackService, JwtHelper],

})
export class InvestTrackModule { }
