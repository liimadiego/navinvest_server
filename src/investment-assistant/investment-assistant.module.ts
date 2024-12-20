import { Module } from '@nestjs/common';
import { InvestmentAssistantService } from './investment-assistant.service';
import { InvestmentAssistantController } from './investment-assistant.controller';

@Module({
  controllers: [InvestmentAssistantController],
  providers: [InvestmentAssistantService],
  exports: [InvestmentAssistantService]
})
export class InvestmentAssistantModule { }
