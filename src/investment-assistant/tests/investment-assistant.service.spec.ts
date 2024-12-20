import { Test, TestingModule } from '@nestjs/testing';
import { InvestmentAssistantService } from './investment-assistant.service';

describe('InvestmentAssistantService', () => {
  let service: InvestmentAssistantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InvestmentAssistantService],
    }).compile();

    service = module.get<InvestmentAssistantService>(InvestmentAssistantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
