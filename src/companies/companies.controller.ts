import { BadRequestException, Body, Controller, Get, HttpException, HttpStatus, Param, Post, Query, Req } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { JwtHelper } from 'utils/jwt.service';
import { PremiumPlan } from 'decorators/plans.decorator';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService, private readonly jwtHelper: JwtHelper) { }

  @Get('compare')
  async compareCompanies(@Query('tickers') tickers: string): Promise<any> {
    let tickersArr: string[] = [];

    if (!tickers || tickers == '' || tickers.trim() === '') {
      throw new BadRequestException('Tickers are required');
    }

    tickersArr = tickers.split(',');

    return this.companiesService.compareCompanies(tickersArr);
  }

  @PremiumPlan()
  @Post('compare-with-ai')
  async compareCompaniesWithAI(@Body() req: any, @Req() request: any): Promise<any> {
    const { companiesData } = req;

    if (!companiesData) {
      throw new BadRequestException('companiesData is required');
    }
    const userId = await this.jwtHelper.extractUserIdFromRequest(request);

    if (!userId) {
      throw new HttpException('Usuário não encontrado', HttpStatus.UNAUTHORIZED);
    }

    return this.companiesService.compareWithAI(companiesData, userId);
  }

}
