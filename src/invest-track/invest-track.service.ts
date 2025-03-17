import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserAction } from './invest-track-interface';
import OpenAI from 'openai';
import { PromptsService } from 'src/utils/prompts';

@Injectable()
export class InvestTrackService {
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

    async getIAOpinion(action: UserAction): Promise<any> {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: this.getPrompt("invest_track_context") + "\n\n" + this.buildDescription(action) },
                ],
                response_format: { "type": "json_object" }
            });

            return JSON.parse(response.choices[0].message?.content || '{}');
        } catch (error) {
            console.error(error);
            throw new HttpException(
                'Erro ao se comunicar com o OpenAI. Verifique as configurações.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    buildDescription(action: UserAction): string {
        const dictionary_action = {
            registered_information: "Registrou a informação de que acabou de",
            alert_created: "Criou um alerta para",
        }

        const dictionary_transaction = {
            buy: "comprar",
            sell: "vender"
        }

        const boughtFor = action.bought_for ? ` O usuário comprou a ação por R$${action.bought_for}. ` : '';

        let observation = "";

        if (boughtFor && action.action == 'registered_information') {
            observation = action.bought_for > action.asset_value ? ` Obs: O usuário vendeu a ação depois de uma queda de ${(1 - (action.asset_value / action.bought_for)) * 100}%` : "";
        }

        const current_asset_value = action.context?.current_asset_value && action.action == 'alert_created' ? ` Contexto: A ação está custando R$${action.context.current_asset_value} reais neste momento.` : "";

        const description_link = action.action == "alert_created" ? "quando chegar no valor de" : "por";

        const description = `Ação do usuário: ${dictionary_action[action.action]} ${dictionary_transaction[action.transaction_type]} ${action.asset} ${description_link} R$${action.asset_value}.${boughtFor}${current_asset_value}${observation}`

        return description;

    }
}
