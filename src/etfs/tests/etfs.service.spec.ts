import { Test, TestingModule } from '@nestjs/testing';
import { EtfsService } from '../etfs.service';

describe('EtfsService', () => {
  let service: EtfsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EtfsService],
    }).compile();

    service = module.get<EtfsService>(EtfsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
