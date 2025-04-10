import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { InvestmentPortfolioService } from './investment-portfolio.service';
import { CreateInvestmentPortfolioDto } from './dto/create-investment-portfolio-dto';

@Controller('investment-portfolio')
export class InvestmentPortfolioController {
  constructor(private readonly investmentPortfolioService: InvestmentPortfolioService) { }

  @Post()
  async create(@Body() investmentPortfolio: CreateInvestmentPortfolioDto) {
    return await this.investmentPortfolioService.create(investmentPortfolio);
  }

  @Get(':userId')
  async findByUserId(@Param('userId') userId: string) {
    return await this.investmentPortfolioService.findByUserId(userId);
  }
}
