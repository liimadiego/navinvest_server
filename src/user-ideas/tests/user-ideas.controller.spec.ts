import { Test, TestingModule } from '@nestjs/testing';
import { UserIdeasController } from '../user-ideas.controller';
import { UserIdeasService } from '../user-ideas.service';

describe('UserIdeasController', () => {
  let controller: UserIdeasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserIdeasController],
      providers: [UserIdeasService],
    }).compile();

    controller = module.get<UserIdeasController>(UserIdeasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
