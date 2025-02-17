import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TickersEntity } from 'src/entities/tickers.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TickerService {
    constructor(
        @InjectRepository(TickersEntity)
        private readonly tickerRepository: Repository<TickersEntity>
    ) { }

    async getTickers(limit = 0): Promise<TickersEntity[]> {
        if (limit > 0) {
            return this.tickerRepository.find({ take: limit });
        }

        return this.tickerRepository.find();
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
}
