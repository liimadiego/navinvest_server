import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import OpenAI from 'openai';
import { PromptsService } from '../utils/prompts.service';
import { MessageHistoric } from './investment-assistant-interface';
import { TickersEntity } from 'entities/tickers.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { TickerService } from '../ticker/ticker.service';
import { CompaniesService } from 'companies/companies.service';
import { CustomFunction } from 'utils/functions_tools/custom_functions.dto';
import { tools } from 'utils/functions_tools/custom_functions';
// import util from 'node:util';

const util = require('util');

@Injectable()
export class InvestmentAssistantService {
    private openai: OpenAI;
    private prompts = new PromptsService().getPrompts();

    constructor(
        private readonly tickerService: TickerService,
        private readonly companiesService: CompaniesService,
        @InjectRepository(TickersEntity)
        private readonly tickersRepository: TickersEntity,
    ) {
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

            const inputMessages : MessageHistoric[] = [
                { role: 'system', content: this.getPrompt("ia_assistant_context") },
                ...messageHistoric,
                { role: 'user', content: message }
            ];
                
            let response = await this.openai.chat.completions.create({
                model: process.env.OPEN_AI_MODEL,
                messages: inputMessages,
                tools,
                response_format: { "type": "json_object" }
            });

            while (response.choices[0].message?.tool_calls) {
                // Handle custom function call
                
                const toolCall = response.choices[0].message.tool_calls[0];
                // console.log('toolCall:', toolCall, '\n ');

                const functionCall : any = response.choices[0].message.tool_calls[0].function;
                // console.log('functionCall:', functionCall, '\n ');

                const [ serviceName, funcName ] = functionCall.name.split('_');
                const r = await this[serviceName][funcName](...Object.values(JSON.parse(functionCall.arguments)));
                // console.log('response:', r, '\n ');

                inputMessages.push({ role: "system", content: JSON.stringify(toolCall) });
                inputMessages.push({ role: "system", content: JSON.stringify(
                    {
                        type: 'function_response',
                        call_id: toolCall.id,
                        output: typeof r === 'object' ? JSON.stringify(r) : r.toString(),
                    }
                )});

                response = await this.openai.chat.completions.create({
                    model: process.env.OPEN_AI_MODEL,
                    messages: inputMessages,
                    tools,
                    response_format: { "type": "json_object" }
                });
            }

            return JSON.parse(response.choices[0].message?.content || '{}');
            
        } catch (error) {
            console.error('Error in OpenAI interaction:', error, '\n ');

            throw new HttpException(
                'Erro ao se comunicar com o OpenAI. Verifique as configurações.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
