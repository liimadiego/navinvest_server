import { Controller, Post, Body, HttpException, HttpStatus, Req, Get } from '@nestjs/common';
import { InvestmentAssistantService } from './investment-assistant.service';
import { MessageHistoric } from './investment-assistant-interface';
import { StarterPlan, ProPlan, PremiumPlan } from 'decorators/plans.decorator';

@Controller('investment-assistant')
export class InvestmentAssistantController {
  constructor(private readonly investmentAssistantService: InvestmentAssistantService) { }

  @PremiumPlan()
  @Post('ask')
  async ask(@Req() request: Request, @Body() body: { message: string, messageHistoric: MessageHistoric[], chatId: string }) {
    const userId = await this.investmentAssistantService.getUserIdByHeaderRequest(request);

    if (!userId) {
      throw new HttpException('User not found.', HttpStatus.UNAUTHORIZED);
    }

    const { message, chatId } = body;

    if (!message || message.trim() === '') {
      throw new HttpException('Mensagem não pode estar vazia.', HttpStatus.BAD_REQUEST);
    }

    if (!chatId) {
      throw new HttpException('chatId não pode estar vazio.', HttpStatus.BAD_REQUEST);
    }

    const response = await this.investmentAssistantService.interactWithAI(message, chatId, userId);

    try {
      return { success: true, data: response };
    } catch (error) {
      return { success: false, message: 'Erro ao processar a resposta da IA.', data: response };
    }
  }

  @PremiumPlan()
  @Get('get-chat')
  async getChat(@Req() request: Request) {
    const userId = await this.investmentAssistantService.getUserIdByHeaderRequest(request);

    if (!userId) {
      throw new HttpException('User not found.', HttpStatus.UNAUTHORIZED);
    }

    const chat = await this.investmentAssistantService.getChatByUserId(userId);

    if (!chat) {
      throw new HttpException('Chat não encontrado.', HttpStatus.NOT_FOUND);
    }

    return { success: true, data: chat };
  }
}
