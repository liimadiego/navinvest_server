import { Module } from '@nestjs/common';
import { AssetReportAiService } from './asset-report-ai.service';
import { AssetReportAiController } from './asset-report-ai.controller';

@Module({
  controllers: [AssetReportAiController],
  providers: [AssetReportAiService],
})
export class AssetReportAiModule {}
