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
    try {
      const response = await this.b3ImportService.getB3AuthToken();
      return response;

    } catch (error) {
      throw new BadRequestException(error?.message || 'Erro ao obter token de autenticação da B3');
    }
  }

  @Get('user-transactions')
  async getUserTransactions(
    @Query('portfolioId') portfolioId: string, 
    @Query('fromStart') fromStart: string = 'false',
    @Req() request: any
  ) {
    try {
      if (!portfolioId) {
        throw new BadRequestException('Portfolio ID é obrigatório');
      }

      const userId = await this.jwtHelper.extractUserIdFromRequest(request)
      if (!userId) {
        throw new BadRequestException('Usuário não encontrado');
      }

      const response = await this.b3ImportService.importB3UserTransactions(userId, portfolioId, (fromStart === 'true'));
      if (!response || !response.success) {
        throw new BadRequestException(response?.message || 'Erro ao importar transações da B3');
      }

      return response;

    } catch (error) {
      throw new BadRequestException(error?.message || 'Erro ao importar transações da B3');
    }
  }
  
  @Get('user-authorization')
  async getUserAuthorization(@Req() request: any) {
    try {
      const userId = await this.jwtHelper.extractUserIdFromRequest(request)
      if (!userId) {
        throw new BadRequestException('Usuário não encontrado');
      }
      
      const response = await this.b3ImportService.checkB3UserAuthorization(userId);
      return response;
      
    } catch (error) {
      throw new BadRequestException(error?.message || 'Erro ao obter status de autorização do usuário B3');
    }
  }
}