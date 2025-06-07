import { Controller } from '@nestjs/common';
import { BdrsService } from './bdrs.service';

@Controller('bdrs')
export class BdrsController {
  constructor(private readonly bdrsService: BdrsService) {}
}
