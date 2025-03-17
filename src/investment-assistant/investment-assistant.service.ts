import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import OpenAI from 'openai';
import { PromptsService } from '..@utils';
import { MessageHistoric } from './investment-assistant-interface';

@Injectable()
export class InvestmentAssistantService {
    private openai: OpenAI;
    private prompts = new PromptsService().getPrompts();

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    getPrompt(name: string): string | null {
        return this.prompts[name] || null;
    }

    async interactWithAI(message: string, messageHistoric: MessageHistoric[] = []): Promise<any> {
        try {
            messageHistoric = messageHistoric.slice(-5);

            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: this.getPrompt("ia_assistant_context") },
                    ...messageHistoric,
                    { role: 'user', content: message }
                ],
                response_format: { "type": "json_object" }
            });

            return JSON.parse(response.choices[0].message?.content || '{}');
        } catch (error) {
            throw new HttpException(
                'Erro ao se comunicar com o OpenAI. Verifique as configurações.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
