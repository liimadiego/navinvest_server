import { Module } from '@nestjs/common';
import { AssetReportAiService } from './asset-report-ai.service';
import { AssetReportAiController } from './asset-report-ai.controller';
import { UsersService } from 'users/users.service';
import { UserEntity } from 'entities/user.entity';
import { TokenUsageEntity } from 'entities/token-usage.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtHelper } from 'utils/jwt.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, TokenUsageEntity]),
  ],
  controllers: [AssetReportAiController],
  providers: [AssetReportAiService, UsersService, JwtHelper],
})
export class AssetReportAiModule { }
