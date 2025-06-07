import { Test, TestingModule } from '@nestjs/testing';
import { BdrsController } from '../bdrs.controller';
import { BdrsService } from '../bdrs.service';

describe('BdrsController', () => {
  let controller: BdrsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BdrsController],
      providers: [BdrsService],
    }).compile();

    controller = module.get<BdrsController>(BdrsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
