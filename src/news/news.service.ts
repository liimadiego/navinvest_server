import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NewsEntity } from 'src/entities/news.entity';
import { TickersEntity } from 'src/entities/tickers.entity';
import { Repository } from 'typeorm';

@Injectable()
export class NewsService {
    constructor(
        @InjectRepository(NewsEntity)
        private readonly newsRepository: Repository<NewsEntity>,
        @InjectRepository(TickersEntity)
        private readonly tickerRepository: Repository<TickersEntity>
    ) { }

    async saveNews(news: NewsEntity): Promise<NewsEntity> {
        let missingFields = [];

        if (!news.title) {
            missingFields.push('title');
        }

        if (!news.ticker) {
            missingFields.push('ticker_id');
        }

        if (!news.content) {
            missingFields.push('content');
        }

        if (!news.source) {
            missingFields.push('source');
        }

        if (missingFields.length > 0) {
            throw new Error(`Missing fields: ${missingFields.join(', ')}`);
        }

        return this.newsRepository.save(news);
    }

    async getLastNewsTitleByTicker(ticker: string): Promise<string> {
        const tickerEntity = await this.tickerRepository.findOne({ where: { ticker } });

        if (!tickerEntity) {
            return null;
        }

        const news = await this.newsRepository.createQueryBuilder("news")
            .where("news.ticker_id = :tickerId", { tickerId: tickerEntity.id })
            .orderBy("news.published_at", "DESC")
            .getOne();

        return news ? news.title : null;
    }
}
