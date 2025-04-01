import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { PortfolioTransactionsService } from './portfolio-transactions.service';
import { CreatePortfolioTransactionDto } from './dto/create-portfolio-transaction-dto';

@Controller('portfolio-transactions')
export class PortfolioTransactionsController {
  constructor(private readonly portfolioTransactionsService: PortfolioTransactionsService) { }

  //createTransaction
  @Post()
  async createTransaction(@Body() createDto: CreatePortfolioTransactionDto): Promise<any> {
    return this.portfolioTransactionsService.createTransaction(createDto);
  }

  //getTransactions
  @Get(':portfolioId')
  async getTransactions(@Param('portfolioId') portfolioId: string): Promise<any> {
    return this.portfolioTransactionsService.getTransactions(portfolioId);
  }

}
