import { Injectable, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { NewsService } from '../news/news.service';
import { TickerService } from '../ticker/ticker.service';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
//importa o fs
import * as fs from 'fs';

@Injectable()
export class CronNewsService implements OnModuleInit {
    constructor(
        private readonly tickerService: TickerService,
        private readonly newsService: NewsService
    ) { }

    onModuleInit() {
        this.startCronJob();
    }

    private async startCronJob() {
        // cron.schedule('* * * * *', async () => {
        //      await this.functionGetFinancialContextWithAI(); //rodar todos os dias
        //      await this.saveNewsInDatabase();
        //      await this.sendNewsToSubscribers();
        // });
        // this.saveNewsInDatabase();
        // console.log('Cron job agendada.');
    }

    private async fetchAndSaveNews(searchTerm: string, ticker: any) {
        let urlToSearch = `https://gnews.io/api/v4/search?country=br&q=${searchTerm}&apikey=${process.env.GNEWS_API_KEY}`;
        let response = await fetch(urlToSearch);
        let data = await response.json();

        if (data.articles && data.articles.length > 0) {
            console.log(`Encontradas ${data.articles.length} notícias para "${searchTerm}"`);
            for (const article of data.articles) {
                let newsWithThisUrl = await this.newsService.getNewsByUrl(article.url);
                if (!newsWithThisUrl) {
                    await this.newsService.saveNews({
                        id: null,
                        uuid: uuidv4(),
                        title: article.title,
                        description: article.description,
                        content: article.content,
                        source: article.source.name,
                        url: article.url,
                        image_url: article.image || null,
                        published_at: new Date(article.publishedAt),
                        created_at: new Date(),
                        ticker: ticker
                    });
                }
            }
            console.log(`Notícias salvas para "${searchTerm}"`);
        }

        //força aguardar 1s para não estourar o limite de requisições da API
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    private async saveNewsInDatabase() {
        const searchedCompanyNames = new Set<string>();
        const tickers = await this.tickerService.getTickersToSearchNews(20);

        for (const ticker of tickers) {
            console.log(`Buscando notícias para o ticker ${ticker.ticker}`);
            const tickerEntity = await this.tickerService.getTickerById(ticker.id);
            const companyName = tickerEntity.asset_name;

            await this.fetchAndSaveNews(ticker.ticker, tickerEntity);

            // if (!searchedCompanyNames.has(companyName)) {
            //     console.log(`Buscando notícias para a empresa ${companyName}`);

            //     await this.fetchAndSaveNews(companyName, tickerEntity);

            //     searchedCompanyNames.add(companyName);
            // }

            await this.tickerService.updateLatestSearchNews(ticker);
        }
    }

    private async sendNewsToSubscribers() {
        const news: any = await this.newsService.getNewsToSendToSubscribers(50);

        for (const newsItem of news) {
            console.log(`Enviando notícia para o usuário ${newsItem.u_email} (${newsItem.t_ticker})`);
        }
    }

    private async functionGetFinancialContextWithAI() {
        const todayFormatted = new Date().toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\//g, '/');

        const prompt = `Utilizando como base esse modelo, me de um contexto geral do mundo dos investimentos e o que o ronda. A pesquisa deve ser feita na data de hoje (${todayFormatted}) com dados atualizados e fontes confiáveis.

        Modelo: {
        "cenário_global": "xxx", 
        "cenário_brasil": "xxx", 
        "notícias_relevantes": [
            "xxx", 
            "xxx" 
        ],
        "indicadores": {
            "selic": "x.x%", 
            "ipca_anual": "x.x%", 
            "ibov_variacao_7d": "-x.x%", 
            "sp500_variacao_7d": "+x.x%" 
        }
        }

        Não se prenda ao modelo, ele não é completo, o que você puder trazer de contexto traga, será a base para uma ferramenta muito importante.

        Retorne JSON.`;

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'tools=v1'
            },
            body: JSON.stringify({
                model: process.env.OPEN_AI_MODEL,
                input: prompt,
                instructions: 'Use a ferramenta web search para buscar informações atualizadas.',
                tools: [{ type: 'web_search' }],
                tool_choice: 'auto',
                temperature: 0.7,
                top_p: 1.0,
                store: true,
            }),
        });

        const initialData = await response.json();
        const id = initialData.id;

        for (let i = 0; i < 20; i++) {
            await new Promise(resolve => setTimeout(resolve, 3000));

            const final = await fetch(`https://api.openai.com/v1/responses/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'tools=v1'
                }
            });

            const finalData = await final.json();

            const hasMessageType = finalData.output.some((item: any) => item.type === 'message');
            if (hasMessageType) {
                const messageItem = finalData.output.find((item: any) => item.type === 'message');
                if (messageItem && messageItem.content && messageItem.content.length > 0) {
                    try {
                        const parsedJson = JSON.parse(messageItem.content[0].text);
                        fs.writeFileSync('financial_context.json', JSON.stringify(parsedJson, null, 2));
                    } catch (error) {
                        fs.writeFileSync('financial_context.json', messageItem.content[0].text);
                        console.error('Erro ao fazer o parse do JSON:', error);
                    }
                }
                return;
            }

            console.log(`⏳ Aguardando... tentativa ${i + 1}`);
        }
    }


}
