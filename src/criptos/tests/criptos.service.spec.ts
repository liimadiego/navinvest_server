import { Test, TestingModule } from '@nestjs/testing';
import { CriptosService } from '../criptos.service';

describe('CriptosService', () => {
  let service: CriptosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CriptosService],
    }).compile();

    service = module.get<CriptosService>(CriptosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
