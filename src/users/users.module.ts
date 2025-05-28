import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { TokenUsageEntity } from 'entities/token-usage.entity';
import { JwtHelper } from 'utils/jwt.service';
import { PlanEntity } from 'entities/plan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, TokenUsageEntity, PlanEntity]),
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtHelper],
  exports: [UsersService],
})
export class UsersModule { }
