import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { CompaniesService } from './companies.service';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) { }

  @Get('compare')
  async compareCompanies(@Query('tickers') tickers: string[]): Promise<any> {
    console.log('tickers raw:', tickers);
    if (!tickers || tickers.length === 0) {
      throw new BadRequestException('Tickers are required');
    }
    return this.companiesService.compareCompanies(tickers);
  }

}
