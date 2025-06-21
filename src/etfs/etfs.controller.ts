import { Controller } from '@nestjs/common';
import { EtfsService } from './etfs.service';

@Controller('etfs')
export class EtfsController {
  constructor(private readonly etfsService: EtfsService) {}
}
