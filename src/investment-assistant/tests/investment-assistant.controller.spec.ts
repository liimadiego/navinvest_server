import { Test, TestingModule } from '@nestjs/testing';
import { InvestmentAssistantController } from '../investment-assistant.controller';
import { InvestmentAssistantService } from '../investment-assistant.service';

describe('InvestmentAssistantController', () => {
  let controller: InvestmentAssistantController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvestmentAssistantController],
      providers: [InvestmentAssistantService],
    }).compile();

    controller = module.get<InvestmentAssistantController>(InvestmentAssistantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
