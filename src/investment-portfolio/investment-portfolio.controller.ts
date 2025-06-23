import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { InvestmentPortfolioService } from './investment-portfolio.service';
import { CreateInvestmentPortfolioDto } from './dto/create-investment-portfolio-dto';
import { UpdateInvestmentPortfolioDto } from './dto/update-investment-portfolio-dto';

@Controller('investment-portfolio')
export class InvestmentPortfolioController {
  constructor(private readonly investmentPortfolioService: InvestmentPortfolioService) { }

  @Post()
  async create(@Req() request: Request, @Body() investmentPortfolio: CreateInvestmentPortfolioDto) {
    const userId = await this.investmentPortfolioService.getUserIdByHeaderRequest(request);

    if (!userId) {
      throw new Error('User not found.');
    }

    return await this.investmentPortfolioService.create(investmentPortfolio, userId);
  }

  @Put(':id')
  async update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() investmentPortfolio: UpdateInvestmentPortfolioDto
  ) {
    const userId = await this.investmentPortfolioService.getUserIdByHeaderRequest(request);

    if (!userId) {
      throw new Error('User not found.');
    }

    return await this.investmentPortfolioService.update(investmentPortfolio, id, userId);
  }

  @Delete(':id')
  async delete(@Req() request: Request, @Param('id') id: string) {
    const userId = await this.investmentPortfolioService.getUserIdByHeaderRequest(request);

    if (!userId) {
      throw new Error('User not found.');
    }

    return await this.investmentPortfolioService.delete(id, userId);
  }

  @Get()
  async find(@Req() request: Request) {
    const userId = await this.investmentPortfolioService.getUserIdByHeaderRequest(request);

    if (!userId) {
      throw new Error('User not found.');
    }
    return await this.investmentPortfolioService.findByUserId(userId);
  }

  @Get('total-assets/:investmentPortfolioId')
  async getTotalAssetsByInvestmentPortfolioId(
    @Req() request: Request,
    @Param('investmentPortfolioId') investmentPortfolioId: string
  ) {
    const userId = await this.investmentPortfolioService.getUserIdByHeaderRequest(request);

    if (!investmentPortfolioId) {
      throw new Error('Investment Portfolio ID is required.');
    }

    return await this.investmentPortfolioService.getTotalAssetsByInvestmentPortfolioId(investmentPortfolioId, userId);
  }

  @Get('total-invested/:investmentPortfolioId')
  async getTotalInvestedByInvestmentPortfolioId(
    @Req() request: Request,
    @Param('investmentPortfolioId') investmentPortfolioId: string
  ) {
    const userId = await this.investmentPortfolioService.getUserIdByHeaderRequest(request);

    if (!investmentPortfolioId) {
      throw new Error('Investment Portfolio ID is required.');
    }

    return await this.investmentPortfolioService.getTotalInvestedByInvestmentPortfolioId(investmentPortfolioId, userId);
  }

  @Get('portfolio-data/:investmentPortfolioId')
  async getPortfolioDataByPortfolioId(
    @Req() request: Request,
    @Param('investmentPortfolioId') investmentPortfolioId: string
  ) {
    const userId = await this.investmentPortfolioService.getUserIdByHeaderRequest(request);

    if (!investmentPortfolioId) {
      throw new Error('Investment Portfolio ID is required.');
    }

    return await this.investmentPortfolioService.getPortfolioDataByPortfolioId(investmentPortfolioId, userId);
  }
}