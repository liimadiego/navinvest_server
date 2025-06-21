import { Test, TestingModule } from '@nestjs/testing';
import { EtfsController } from '../etfs.controller';
import { EtfsService } from '../etfs.service';

describe('EtfsController', () => {
  let controller: EtfsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EtfsController],
      providers: [EtfsService],
    }).compile();

    controller = module.get<EtfsController>(EtfsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
