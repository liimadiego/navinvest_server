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
        console.log('Executando cron job a cada minuto:', new Date().toISOString());
        const tickers = await this.tickerService.getTickersToSearchNews(20);

        for (const ticker of tickers) {
            console.log(`Buscando notícias para o ticker ${ticker.ticker}`);
            const tickerEntity = await this.tickerService.getTickerById(ticker.id);
            const lastNewsTitleToThisTicker = await this.newsService.getLastNewsTitleByTicker(ticker.ticker);

            let urlToSearch = `https://gnews.io/api/v4/search?country=br&q=${ticker.ticker}&apikey=${process.env.GNEWS_API_KEY}`;

            let response = await fetch(urlToSearch);
            let data = await response.json();

            if (data.articles && data.articles.length > 0) {
                console.log(`Encontradas ${data.articles.length} notícias para o ticker ${ticker.ticker}`);
                for (const article of data.articles) {
                    if (article.title !== lastNewsTitleToThisTicker) {
                        await this.newsService.saveNews({
                            id: null,
                            title: article.title,
                            description: article.description,
                            content: article.content,
                            source: article.source.name,
                            url: article.url,
                            image_url: article.image || null,
                            published_at: new Date(article.publishedAt),
                            created_at: new Date(),
                            ticker: tickerEntity
                        });
                    } else {
                        break;
                    }
                }
                console.log(`Notícias salvas para o ticker ${ticker.ticker}`);
            }

            await this.tickerService.updateLatestSearchNews(ticker);
        }
        // });

        console.log('Cron job agendada.');
    }

}
