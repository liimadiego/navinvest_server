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

  @Get('total-assets/:investmentPortfolioId')
  async getTotalAssetsByInvestmentPortfolioId(@Param('investmentPortfolioId') investmentPortfolioId: string) {
    if (!investmentPortfolioId) {
      throw new Error('Investment Portfolio ID is required.');
    }

    return await this.investmentPortfolioService.getTotalAssetsByInvestmentPortfolioId(investmentPortfolioId);
  }

  @Get('total-invested/:investmentPortfolioId')
  async getTotalInvestedByInvestmentPortfolioId(@Param('investmentPortfolioId') investmentPortfolioId: string) {
    if (!investmentPortfolioId) {
      throw new Error('Investment Portfolio ID is required.');
    }

    return await this.investmentPortfolioService.getTotalInvestedByInvestmentPortfolioId(investmentPortfolioId);
  }

  @Get('portfolio-data/:investmentPortfolioId')
  async getPortfolioDataByPortfolioId(@Param('investmentPortfolioId') investmentPortfolioId: string) {
    if (!investmentPortfolioId) {
      throw new Error('Investment Portfolio ID is required.');
    }

    return await this.investmentPortfolioService.getPortfolioDataByPortfolioId(investmentPortfolioId);
  }
}
