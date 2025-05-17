import { Module } from '@nestjs/common';
import { InvestorProfileService } from './investor-profile.service';
import { InvestorProfileController } from './investor-profile.controller';
import { InvestorProfileEntity } from '../entities/investor-profile.entity';
import { UserEntity } from '../entities/user.entity';
import { TagEntity } from '../entities/tag.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtHelper } from 'utils/jwt.service';
import { UsersService } from 'users/users.service';
import { TokenUsageEntity } from 'entities/token-usage.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvestorProfileEntity,
      UserEntity,
      TagEntity,
      TokenUsageEntity,
    ])
  ],
  controllers: [InvestorProfileController],
  providers: [InvestorProfileService, JwtHelper, UsersService],
})
export class InvestorProfileModule { }
