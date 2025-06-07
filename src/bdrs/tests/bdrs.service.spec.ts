import { Test, TestingModule } from '@nestjs/testing';
import { BdrsService } from '../bdrs.service';

describe('BdrsService', () => {
  let service: BdrsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BdrsService],
    }).compile();

    service = module.get<BdrsService>(BdrsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
