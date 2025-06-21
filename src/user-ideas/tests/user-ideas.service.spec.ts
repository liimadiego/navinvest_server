import { Test, TestingModule } from '@nestjs/testing';
import { UserIdeasService } from '../user-ideas.service';

describe('UserIdeasService', () => {
  let service: UserIdeasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserIdeasService],
    }).compile();

    service = module.get<UserIdeasService>(UserIdeasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
