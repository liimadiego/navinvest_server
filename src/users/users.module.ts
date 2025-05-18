import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { TokenUsageEntity } from 'entities/token-usage.entity';
import { JwtHelper } from 'utils/jwt.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, TokenUsageEntity]),
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtHelper],
  exports: [UsersService],
})
export class UsersModule { }
