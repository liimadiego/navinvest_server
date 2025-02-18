import { Module } from '@nestjs/common';
import { InvestorProfileService } from './investor-profile.service';
import { InvestorProfileController } from './investor-profile.controller';
import { InvestorProfileEntity } from 'src/entities/investor-profile.entity';
import { UserEntity } from 'src/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvestorProfileEntity,
      UserEntity
    ])
  ],
  controllers: [InvestorProfileController],
  providers: [InvestorProfileService],
})
export class InvestorProfileModule { }
