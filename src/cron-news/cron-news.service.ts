import { Injectable, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { NewsService } from '../news/news.service';
import { TickerService } from '../ticker/ticker.service';
import fetch from 'node-fetch';

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
        //      this.saveNewsInDatabase();
        //      this.sendNewsToSubscribers();
        // });

        console.log('Cron job agendada.');
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
                        uuid: null,
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
            const companyName = tickerEntity.name;

            await this.fetchAndSaveNews(ticker.ticker, tickerEntity);

            if (!searchedCompanyNames.has(companyName)) {
                console.log(`Buscando notícias para a empresa ${companyName}`);

                await this.fetchAndSaveNews(companyName, tickerEntity);

                searchedCompanyNames.add(companyName);
            }

            await this.tickerService.updateLatestSearchNews(ticker);
        }
    }

    private async sendNewsToSubscribers() {
        const news: any = await this.newsService.getNewsToSendToSubscribers(50);

        for (const newsItem of news) {
            console.log(`Enviando notícia para o usuário ${newsItem.u_email} (${newsItem.t_ticker})`);
        }
    }

}
