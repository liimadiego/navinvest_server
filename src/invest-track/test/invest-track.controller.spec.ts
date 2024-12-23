import { Test, TestingModule } from '@nestjs/testing';
import { InvestTrackController } from '../invest-track.controller';
import { InvestTrackService } from '../invest-track.service';

describe('InvestTrackController', () => {
  let controller: InvestTrackController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvestTrackController],
      providers: [InvestTrackService],
    }).compile();

    controller = module.get<InvestTrackController>(InvestTrackController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
