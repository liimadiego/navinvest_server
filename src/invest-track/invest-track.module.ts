import { Module } from '@nestjs/common';
import { InvestTrackService } from './invest-track.service';
import { InvestTrackController } from './invest-track.controller';

@Module({
  controllers: [InvestTrackController],
  providers: [InvestTrackService],
})
export class InvestTrackModule {}
