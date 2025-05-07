import { Controller, Get, Param, Query } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { Public } from 'decorators/public.decorator';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) { }

  @Get(':ticker')
  async getCompanyData(@Param('ticker') ticker: string): Promise<any> {
    if (!ticker) {
      throw new Error('Ticker is required');
    }
    return this.companiesService.getCompanyByTicker(ticker);
  }
}
