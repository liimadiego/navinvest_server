import { Test, TestingModule } from '@nestjs/testing';
import { InvestTrackService } from '../invest-track.service';

describe('InvestTrackService', () => {
  let service: InvestTrackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InvestTrackService],
    }).compile();

    service = module.get<InvestTrackService>(InvestTrackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
