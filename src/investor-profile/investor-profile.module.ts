import { Module } from '@nestjs/common';
import { InvestorProfileService } from './investor-profile.service';
import { InvestorProfileController } from './investor-profile.controller';
import { InvestorProfileEntity } from '../entities/investor-profile.entity';
import { UserEntity } from '../entities/user.entity';
import { TagEntity } from '../entities/tag.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvestorProfileEntity,
      UserEntity,
      TagEntity
    ])
  ],
  controllers: [InvestorProfileController],
  providers: [InvestorProfileService],
})
export class InvestorProfileModule { }
