import { Controller } from '@nestjs/common';
import { CriptosService } from './criptos.service';

@Controller('criptos')
export class CriptosController {
  constructor(private readonly criptosService: CriptosService) {}
}
