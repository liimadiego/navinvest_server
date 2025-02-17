import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NewsEntity } from 'src/entities/news.entity';
import { TickersEntity } from 'src/entities/tickers.entity';
import { UserEntity } from 'src/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class NewsService {
    constructor(
        @InjectRepository(NewsEntity)
        private readonly newsRepository: Repository<NewsEntity>,
        @InjectRepository(TickersEntity)
        private readonly tickerRepository: Repository<TickersEntity>,
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
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

    async getNewsToSendToSubscribers(limit = 0): Promise<UserEntity[]> {
        const query = this.userRepository
            .createQueryBuilder("u")
            .select([
                "u.id",
                "u.fullName",
                "u.email",
                "u.phoneNumber",
                "n.*",
                "t.id",
                "t.ticker",
                "t.name",
                "un.sent_at",
            ])
            .innerJoin("user_tickers_subscribe", "uts", "uts.user_id = u.id")
            .innerJoin("news", "n", "n.ticker_id = uts.ticker_id")
            .innerJoin("tickers", "t", "t.id = n.ticker_id")
            .leftJoin("user_news", "un", "un.user_id = u.id AND un.news_id = n.id")
            .where("u.status = :status", { status: "active" })
            .andWhere("un.sent_at IS NULL")
            .andWhere("n.created_at >= NOW() - INTERVAL '24 hours'");

        if (limit > 0) {
            query.limit(limit);
        }

        const result = await query.getRawMany();

        return result;
    }

    async getNewsByUrl(url: string): Promise<NewsEntity> {
        return this.newsRepository.findOne({ where: { url } });
    }
}
