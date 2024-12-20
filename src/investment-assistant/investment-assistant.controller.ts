import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { InvestmentAssistantService } from './investment-assistant.service';
import { MessageHistoric } from './investment-interface';

@Controller('investment-assistant')
export class InvestmentAssistantController {
  constructor(private readonly investmentAssistantService: InvestmentAssistantService) { }

  @Post('ask')
  async ask(@Body() body: { message: string, messageHistoric: MessageHistoric[] }) {
    const { message, messageHistoric } = body;

    if (!message || message.trim() === '') {
      throw new HttpException('Mensagem não pode estar vazia.', HttpStatus.BAD_REQUEST);
    }

    if (messageHistoric && !Array.isArray(messageHistoric)) {
      throw new HttpException('Histórico deve ser um array.', HttpStatus.BAD_REQUEST);
    }

    const response = await this.investmentAssistantService.interactWithAI(message, messageHistoric);

    try {
      return { success: true, data: response };
    } catch (error) {
      return { success: false, message: 'Erro ao processar a resposta da IA.', data: response };
    }
  }
}
