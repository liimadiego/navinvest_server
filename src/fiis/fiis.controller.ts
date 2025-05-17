import { BadRequestException, HttpStatus, Controller, Get, Param, Query } from '@nestjs/common';
import { FiisService } from './fiis.service';

@Controller('fiis')
export class FiisController {
  constructor(private readonly fiisService: FiisService) { }

  @Get(':ticker')
  async getFiisData(@Param('ticker') ticker: string): Promise<any> {
    try {
      if (!ticker) throw new Error('Ticker is required');
      return (await this.fiisService.getFiiByTicker(ticker));
    } catch (error) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: [ error.toString() ]
      });
    }
  }
}