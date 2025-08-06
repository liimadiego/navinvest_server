import { BadRequestException, Controller, Get, Query, Req } from '@nestjs/common';
import { B3ImportService } from './b3-import.service';
import { JwtHelper } from 'utils/jwt.service';

@Controller('b3-import')
export class B3ImportController {
  constructor(
    private readonly b3ImportService: B3ImportService,
    private readonly jwtHelper: JwtHelper
  ) {}

  @Get('auth-token')
  async getAuthToken() {
    // Implement the logic to get the authentication token
    return this.b3ImportService.getAuthToken();
  }

  @Get('user-transactions')
  async getUserTransactions(@Query('portfolioId') portfolioId: string, @Req() request: any) {
    if (!portfolioId) {
      throw new BadRequestException('Portfolio ID is required');
    }

    const userId = await this.jwtHelper.extractUserIdFromRequest(request)
    if (!userId) {
      throw new BadRequestException('Usuário não encontrado');
    }

    const response = await this.b3ImportService.importUserTransactions(userId, portfolioId);

    if (!response || !response.success) {
      throw new BadRequestException(response?.message || 'Erro ao processar o arquivo');
    }

    return response;

  }
}