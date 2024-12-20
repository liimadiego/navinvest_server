import { Controller } from '@nestjs/common';
import { InvestmentAssistantService } from './investment-assistant.service';

@Controller('investment-assistant')
export class InvestmentAssistantController {
  constructor(private readonly investmentAssistantService: InvestmentAssistantService) { }
}
