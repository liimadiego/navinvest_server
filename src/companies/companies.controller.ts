import { Controller, Get, Param, Query } from '@nestjs/common';
import { CompaniesService } from './companies.service';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) { }

  @Get('compare')
  async compareCompanies(@Query('tickers') tickers: string[]): Promise<any> {
    if (!tickers || tickers.length === 0) {
      throw new Error('Tickers are required');
    }
    console.log('tickers', tickers);
    return this.companiesService.compareCompanies(tickers);
  }

}
