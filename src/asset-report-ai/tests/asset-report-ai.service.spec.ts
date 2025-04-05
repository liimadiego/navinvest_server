import { Test, TestingModule } from '@nestjs/testing';
import { AssetReportAiService } from '../asset-report-ai.service';

describe('AssetReportAiService', () => {
  let service: AssetReportAiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssetReportAiService],
    }).compile();

    service = module.get<AssetReportAiService>(AssetReportAiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
