import { Test, TestingModule } from '@nestjs/testing';
import { AssetReportAiController } from '../asset-report-ai.controller';
import { AssetReportAiService } from '../asset-report-ai.service';

describe('AssetReportAiController', () => {
  let controller: AssetReportAiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssetReportAiController],
      providers: [AssetReportAiService],
    }).compile();

    controller = module.get<AssetReportAiController>(AssetReportAiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
