import { Test, TestingModule } from '@nestjs/testing';
import { CronNewsService } from '../cron-news.service';

describe('CronNewsService', () => {
  let service: CronNewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CronNewsService],
    }).compile();

    service = module.get<CronNewsService>(CronNewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
