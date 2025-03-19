import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NewsEntity } from '../entities/news.entity';
import { UserEntity } from '../entities/user.entity';
import { LessThan, MoreThan, Repository } from 'typeorm';

@Injectable()
export class NewsService {
    constructor(
        @InjectRepository(NewsEntity)
        private readonly newsRepository: Repository<NewsEntity>,
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
                "u.full_name",
                "u.email",
                "u.phone_number",
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

    async getNewsById(uuid: string): Promise<any> {
        const news = await this.newsRepository.findOne({ where: { uuid: uuid } });
        if (!news) {
            throw new Error('News not found');
        }
        const { id, ...rest } = news;
        return rest;
    }

    async getLatestNews(): Promise<any[]> {
        const news = await this.newsRepository.find({
            take: 3,
            order: {
                created_at: 'DESC'
            }
        });

        return news.map(({ id, ...rest }) => rest);
    }

    async getOtherNews(uuid: string): Promise<any[]> {
        const currentNews = await this.newsRepository.findOne({ where: { uuid } });

        if (!currentNews) {
            throw new Error('News not found');
        }

        let news = await this.newsRepository.find({
            where: { created_at: MoreThan(currentNews.created_at) },
            order: { created_at: 'ASC' },
            take: 3,
        });

        if (news.length < 3) {
            const remainingNews = await this.newsRepository.find({
                where: { created_at: LessThan(currentNews.created_at) },
                order: { created_at: 'DESC' },
                take: 3 - news.length,
            });
            news = news.concat(remainingNews);
        }

        return news.map(({ id, ...rest }) => rest);
    }
}
