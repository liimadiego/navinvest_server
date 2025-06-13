import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { CompaniesService } from './companies.service';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) { }

  @Get('compare')
  async compareCompanies(@Query('tickers') tickers: string): Promise<any> {
    let tickersArr: string[] = [];

    if (!tickers || tickers == '' || tickers.trim() === '') {
      throw new BadRequestException('Tickers are required');
    }

    tickersArr = tickers.split(',');

    return this.companiesService.compareCompanies(tickersArr);
  }

}
