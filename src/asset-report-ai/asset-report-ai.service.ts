import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { PromptsService } from '../utils/prompts.service';

@Injectable()
export class AssetReportAiService {
    private openai: OpenAI;
    private prompts = new PromptsService();

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    getPrompt(name: string, sector_name: string, sector_average: any): string | null {
        return this.prompts.getPrompts({
            sector_name,
            sector_average: JSON.stringify(sector_average)
        })[name] || null;
    }

    async generateReport(company_data: any): Promise<string> {
        const sector_name = 'Petróleo e Gás';
        const sector_average = JSON.stringify({
            "p_l_medio": 7.5,
            "roe_medio": 8.2,
            "divida_liquida_ebitda_media": 2.1,
            "dividend_yield_medio": 8.7,
            "margem_liquida_media": 6.2
        });

        if (!company_data) {
            throw new Error('Os dados da empresa não foram encontrados.');
        }

        const response = await this.openai.chat.completions.create({
            model: process.env.OPEN_AI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: this.getPrompt('asset_report_ai', sector_name, sector_average)
                },
                {
                    role: 'user',
                    content: JSON.stringify(company_data),
                },
            ],
            max_tokens: 1500,
            temperature: 0.7,
        });

        return response.choices[0].message.content;
    }
}
