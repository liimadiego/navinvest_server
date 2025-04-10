import { Controller, Post, Body, Get, Param, Put, Delete } from '@nestjs/common';
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

  @Put(':id')
  async editTransaction(@Param('id') id: string, @Body() data: any): Promise<any> {
    if (!id) {
      throw new Error('ID is required');
    }
    data.id = id;

    return this.portfolioTransactionsService.editTransaction(data);
  }

  @Delete(':id')
  async deleteTransaction(@Param('id') id: string): Promise<any> {
    if (!id) {
      throw new Error('ID is required');
    }
    return this.portfolioTransactionsService.deleteTransaction(id);
  }

  //getTransactions
  @Get(':portfolioId')
  async getTransactions(@Param('portfolioId') portfolioId: string): Promise<any> {
    return this.portfolioTransactionsService.getTransactions(portfolioId, true);
  }


  //getTransactions
  @Get('consolidated-transactions/:portfolioId')
  async getConsolidatedTransactions(@Param('portfolioId') portfolioId: string): Promise<any> {
    return this.portfolioTransactionsService.getTransactions(portfolioId, false);
  }

}
