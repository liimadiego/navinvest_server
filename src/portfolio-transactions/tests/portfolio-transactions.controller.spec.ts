import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioTransactionsController } from '../portfolio-transactions.controller';
import { PortfolioTransactionsService } from '../portfolio-transactions.service';

describe('PortfolioTransactionsController', () => {
  let controller: PortfolioTransactionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortfolioTransactionsController],
      providers: [PortfolioTransactionsService],
    }).compile();

    controller = module.get<PortfolioTransactionsController>(PortfolioTransactionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
