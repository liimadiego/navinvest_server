import { JwtService } from '@nestjs/jwt';
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
import { BacktestService } from 'backtest/backtest.service';
import { InjectModel } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
    InvestmentAssistantChatRecord,
    InvestmentAssistantChatRecordDocument
} from '../schemas/investment-assistant-chat.schema';
import { Model } from 'mongoose';

const util = require('util');

@Injectable()
export class InvestmentAssistantService {
    private openai: OpenAI;
    private prompts = new PromptsService().getPrompts();

    constructor(
        private readonly tickerService: TickerService,
        private readonly companiesService: CompaniesService,
        private readonly backtestService: BacktestService,
        @InjectRepository(TickersEntity)
        private readonly tickersRepository: TickersEntity,
        @InjectModel(InvestmentAssistantChatRecord.name)
        private readonly investmentAssistantChatRecordModel: Model<InvestmentAssistantChatRecordDocument>,
        private readonly JwtService: JwtService,
    ) {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    getPrompt(name: string): string | null {
        return this.prompts[name] || null;
    }

    async interactWithAI(message: string, chatId: string, userId: string): Promise<any> {
        try {
            let chatRecord = await this.investmentAssistantChatRecordModel.findOne({ chat_id: chatId });

            if (!chatRecord) {
                throw new HttpException('Chat não encontrado.', HttpStatus.NOT_FOUND);
            }

            if (userId !== chatRecord.user_id) {
                throw new HttpException('Usuário não autorizado.', HttpStatus.UNAUTHORIZED);
            }

            const userMessage = {
                id: uuidv4(),
                messageType: 'text',
                answer: message,
                role: 'user',
                senderId: userId,
                createdAt: new Date().toISOString()
            };

            chatRecord.messages.push(userMessage);
            await chatRecord.save();

            const messageHistoric = chatRecord.messages.slice(-10);

            const inputMessages: MessageHistoric[] = [
                { role: 'system', content: this.getPrompt("ia_assistant_context") },
                ...messageHistoric.map(m => {
                    return {
                        role: m.role as "system" | "user" | "assistant" | "developer",
                        content: this.transformInString(m.answer)
                    }
                })
            ];

            let response = await this.openai.chat.completions.create({
                model: process.env.OPEN_AI_MODEL,
                messages: inputMessages,
                tools,
                response_format: { "type": "json_object" }
            });

            while (response.choices[0].message?.tool_calls) {
                const toolCall = response.choices[0].message.tool_calls[0];
                const functionCall: any = response.choices[0].message.tool_calls[0].function;
                if (functionCall.arguments)
                    functionCall.arguments = JSON.parse(functionCall.arguments);

                const [serviceName, funcName] = functionCall.name.split('_');
                const r = await this[serviceName][funcName](...Object.values(functionCall.arguments));
                if (funcName === 'getQuotationsByTicker') {
                    let messagesToSave = [
                        {
                            id: uuidv4(),
                            messageType: 'text',
                            answer: `Aqui estão os dados de fechamento da ação ${functionCall.arguments.ticker}:`,
                            role: 'assistant',
                            senderId: "ai-id",
                            createdAt: new Date().toISOString()
                        },
                        {
                            id: uuidv4(),
                            messageType: 'chart',
                            answer: {
                                series: [{ name: 'Cotação de ' + functionCall.arguments.ticker, data: r.prices.map(x => x.close.toFixed(2)) }],
                                categories: r.prices.map(x => new Date(x.date).toISOString().split('T')[0].split('-').reverse().join('/')),
                            },
                            role: 'assistant',
                            senderId: "ai-id",
                            createdAt: new Date().toISOString()
                        },
                    ]

                    chatRecord.messages.push(...messagesToSave);
                    await chatRecord.save();

                    return {
                        valid_question: true,
                        data: [...messagesToSave.map(m => {
                            return {
                                messageType: m.messageType,
                                answer: m.answer,
                            }
                        })]
                    };
                }

                inputMessages.push({ role: "system", content: JSON.stringify(toolCall) });
                inputMessages.push({
                    role: "system", content: JSON.stringify(
                        {
                            type: 'function_response',
                            call_id: toolCall.id,
                            output: typeof r === 'object' ? JSON.stringify(r) : r.toString(),
                        }
                    )
                });

                response = await this.openai.chat.completions.create({
                    model: process.env.OPEN_AI_MODEL,
                    messages: inputMessages,
                    tools,
                    response_format: { "type": "json_object" }
                });
            }

            const { valid_question, ...content } = JSON.parse(response.choices[0].message?.content);

            let messageToSave = {
                id: uuidv4(),
                messageType: 'text',
                answer: content.answer,
                role: 'assistant',
                senderId: "ai-id",
                createdAt: new Date().toISOString()
            }

            chatRecord.messages.push(messageToSave);
            const savedRecord = await chatRecord.save();

            return { valid_question, data: [{ messageType: 'text', ...content }] };

        } catch (error) {
            console.error('Error in interaction:', error, '\n ');

            throw new HttpException(
                'Erro ao se comunicar com a IA. Já estamos trabalhando nisso.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async getChatByUserId(userId: string) {
        let chatRecord = await this.investmentAssistantChatRecordModel.findOne({ user_id: userId });

        if (!chatRecord) {
            chatRecord = new this.investmentAssistantChatRecordModel({
                chat_id: uuidv4(),
                user_id: userId,
                messages: [],
            });

            await chatRecord.save();
        }

        let chatRecordObj: any = {};
        chatRecordObj = chatRecord.toObject();

        Object.keys(chatRecordObj).map((key) => {
            if (key === '_id' || key === '__v' || key === 'user_id') {
                delete chatRecordObj[key];
            }
        });

        return chatRecordObj;
    }

    transformInString(message: any) {
        if (typeof message === 'object') {
            return JSON.stringify(message);
        }
        return message;
    }

    async getUserIdByHeaderRequest(request: any) {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        const token = authHeader.substring(7);

        const decoded = this.JwtService.decode(token) as { sub: string, email: string };

        return decoded.sub || null;
    }
}
