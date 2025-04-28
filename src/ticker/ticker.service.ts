import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TagEntity } from '../entities/tag.entity';
import { TickersEntity } from '../entities/tickers.entity';
import { TreasuriesEntity } from 'entities/treasuries.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TickerService {
    constructor(
        @InjectRepository(TickersEntity)
        private readonly tickerRepository: Repository<TickersEntity>,
        @InjectRepository(TagEntity)
        private readonly tagRepository: Repository<TagEntity>,
        @InjectRepository(TreasuriesEntity)
        private readonly treasuryRepository: Repository<TreasuriesEntity>
    ) { }

    async getTickers(limit: number = 0, query: string = "", type = ''): Promise<TickersEntity[] | TreasuriesEntity[]> {
        console.log("getTickers", limit, query, type);

        let queryBuilder = type === 'treasury' ?
            this.treasuryRepository.createQueryBuilder("treasuries") :
            this.tickerRepository.createQueryBuilder("tickers")

        if (query) {
            if (type === 'treasury') {
                queryBuilder = queryBuilder.where("(LOWER(treasuries.name) LIKE LOWER(:query))", { query: `%${query}%` });
            } else {
                queryBuilder = queryBuilder.where("(LOWER(tickers.ticker) LIKE LOWER(:query) OR LOWER(tickers.asset_name) LIKE LOWER(:query))", { query: `%${query}%` });
            }
        }

        if (type && type !== 'treasury') {
            queryBuilder = queryBuilder.andWhere("tickers.asset_type = :type", { type });
        }

        if (limit > 0) {
            queryBuilder = queryBuilder.take(limit);
        }

        return queryBuilder.getMany();
    }

    async getTickersToSearchNews(limit = 0): Promise<TickersEntity[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let tickers = this.tickerRepository.createQueryBuilder("tickers")
            .where("tickers.latest_search_news < :today OR tickers.latest_search_news IS NULL", { today });

        if (limit > 0) {
            tickers = tickers.take(limit);
        }

        return tickers.getMany();
    }

    async getTickerByName(ticker: string): Promise<TickersEntity> {
        return this.tickerRepository.createQueryBuilder("tickers")
            .where("tickers.ticker = :ticker", { ticker })
            .getOne();
    }

    async getTickerById(id: number): Promise<TickersEntity> {
        return this.tickerRepository.createQueryBuilder("tickers")
            .where("tickers.id = :id", { id })
            .getOne();
    }

    async updateLatestSearchNews(ticker: TickersEntity): Promise<TickersEntity> {
        ticker.latest_search_news = new Date();
        return this.tickerRepository.save(ticker);
    }

    async getTickersByTags(tags: string[]): Promise<TickersEntity[]> {
        if (!tags.length) {
            return [];
        }

        return this.tickerRepository.createQueryBuilder("tickers")
            .innerJoin("tickers.tags", "tag")
            .where("tag.name IN (:...tags)", { tags })
            .groupBy("tickers.id")
            .having("COUNT(DISTINCT tag.name) = :tagCount", { tagCount: tags.length })
            .getMany();
    }
}
