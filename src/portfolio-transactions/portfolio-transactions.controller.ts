import { Controller, Post, Body, Get, Param, Put, Delete, UseInterceptors, BadRequestException, UploadedFiles, Req } from '@nestjs/common';
import { PortfolioTransactionsService } from './portfolio-transactions.service';
import { CreatePortfolioTransactionDto } from './dto/create-portfolio-transaction-dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import { StarterPlan, ProPlan, PremiumPlan } from 'decorators/plans.decorator';
import { JwtHelper } from 'utils/jwt.service';

@Controller('portfolio-transactions')
export class PortfolioTransactionsController {
  constructor(
    private readonly portfolioTransactionsService: PortfolioTransactionsService,
    private readonly jwtHelper: JwtHelper
  ) { }

  @PremiumPlan()
  @Post('import-wallet/:portfolioId')
  @UseInterceptors(FilesInterceptor('file0', 10, {
    limits: {
      fileSize: 2 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];

      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException(`Tipo de arquivo não suportado: ${file.mimetype}`), false);
      }
    }
  }))
  async importWallet(@UploadedFiles() files: Multer.File[], @Param('portfolioId') portfolioId: string, @Req() request: any): Promise<any> {
    const userId = await this.jwtHelper.extractUserIdFromRequest(request);
    if (!userId) {
      throw new BadRequestException('Usuário não encontrado');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo fornecido');
    }

    if (!portfolioId) {
      throw new BadRequestException('ID da carteira é obrigatório');
    }

    const response = await this.portfolioTransactionsService.processWalletImport(files, userId);

    if (!response || !response.success) {
      throw new BadRequestException(response?.message || 'Erro ao processar o arquivo');
    }

    return response;
  }

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

  @Get(':portfolioId')
  async getTransactions(@Param('portfolioId') portfolioId: string): Promise<any> {
    return this.portfolioTransactionsService.getTransactions(portfolioId, true);
  }

  @Get('consolidated-transactions/:portfolioId')
  async getConsolidatedTransactions(@Param('portfolioId') portfolioId: string): Promise<any> {
    return this.portfolioTransactionsService.getTransactions(portfolioId, false);
  }

  @PremiumPlan()
  @Post('create-transaction-from-wallet-import-data/:portfolioId')
  async createTransactionFromWalletImportData(@Param('portfolioId') portfolioId: string, @Body() data: any): Promise<any> {
    if (!data || !data.data) {
      throw new BadRequestException('Dados inválidos');
    }
    if (!portfolioId) {
      throw new BadRequestException('ID da carteira é obrigatório');
    }

    return this.portfolioTransactionsService.createTransactionFromWalletImportData(data.data, portfolioId);
  }
}
