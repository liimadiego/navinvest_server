import { Module } from '@nestjs/common';
import { InvestTrackService } from './invest-track.service';
import { InvestTrackController } from './invest-track.controller';
import { JwtHelper } from 'utils/jwt.service';
import { UsersService } from 'users/users.service';
import { UserEntity } from 'entities/user.entity';
import { TokenUsageEntity } from 'entities/token-usage.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, TokenUsageEntity]),
  ],
  controllers: [InvestTrackController],
  providers: [InvestTrackService, JwtHelper, UsersService],
})
export class InvestTrackModule { }
