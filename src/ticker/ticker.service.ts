import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TagEntity } from '../entities/tag.entity';
import { TickersEntity } from '../entities/tickers.entity';
import { TreasuriesEntity } from 'entities/treasuries.entity';
import { EconomicIndexesEntity } from 'entities/economic-indexes.entity';
import { Repository } from 'typeorm';
import {
    HistoricalQuotesRecord,
    HistoricalQuotesRecordDocument
} from '../schemas/historical-quotes.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { minDate } from 'class-validator';

@Injectable()
export class TickerService {
    constructor(
        @InjectRepository(TickersEntity)
        private readonly tickerRepository: Repository<TickersEntity>,
        @InjectRepository(TagEntity)
        private readonly tagRepository: Repository<TagEntity>,
        @InjectRepository(TreasuriesEntity)
        private readonly treasuryRepository: Repository<TreasuriesEntity>,
        @InjectRepository(EconomicIndexesEntity)
        private readonly economicIndexesRepository: Repository<EconomicIndexesEntity>,
        @InjectModel(HistoricalQuotesRecord.name)
        private historicalQuotesRecordModel: Model<HistoricalQuotesRecordDocument>,
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

    async getProftabilityByTicker(ticker: string): Promise<any> {
        const tickerData = await this.tickerRepository.createQueryBuilder("tickers")
            .where("tickers.ticker = :ticker", { ticker })
            .getOne();

        if (!tickerData) {
            throw new Error('Ticker not found');
        }

        const tickerId = tickerData.id;
        const priceTwelveMonthsAgo = tickerData.price_twelve_months_ago;
        const historicalQuotesData = await this.historicalQuotesRecordModel.findOne({ tickerId });

        if (!historicalQuotesData) {
            throw new Error('Historical quotes data not found');
        }

        const economicIndexes = await this.economicIndexesRepository.createQueryBuilder("economic_indexes")
            .where("economic_indexes.slug = :slug", { slug: 'ipca' })
            .getMany();

        const treatedEconomicIndexes = economicIndexes.map((index) => {
            return {
                date: index.date,
                value: Number(index.value)
            };
        });

        const quotes: any = historicalQuotesData.quotes;
        const lastQuote = tickerData.current_price
        const quote10Y = this.getQuoteByPeriod(quotes, '10Y').at(-1);
        const quote5Y = this.getQuoteByPeriod(quotes, '5Y').at(-1);
        const quote2Y = this.getQuoteByPeriod(quotes, '2Y').at(-1);
        const quote1Y = priceTwelveMonthsAgo;
        const quote3M = this.getQuoteByPeriod(quotes, '3M').at(-1);
        const quote1M = this.getQuoteByPeriod(quotes, '1M').at(-1);

        const proftability10Y = quote10Y ? lastQuote / quote10Y.adj_close - 1 : null;
        const proftability5Y = quote5Y ? lastQuote / quote5Y.adj_close - 1 : null;
        const proftability2Y = quote2Y ? lastQuote / quote2Y.adj_close - 1 : null;
        const proftability1Y = quote1Y ? lastQuote / quote1Y - 1 : null;
        const proftability3M = quote3M ? lastQuote / quote3M.adj_close - 1 : null;
        const proftability1M = quote1M ? lastQuote / quote1M.adj_close - 1 : null;

        const tenYInflation = proftability10Y ? (1 + proftability10Y) / (1 + this.calculateInflationByPeriod(treatedEconomicIndexes, '10Y')) - 1 : null;
        const fiveYInflation = proftability5Y ? (1 + proftability5Y) / (1 + this.calculateInflationByPeriod(treatedEconomicIndexes, '5Y')) - 1 : null;
        const twoYInflation = proftability2Y ? (1 + proftability2Y) / (1 + this.calculateInflationByPeriod(treatedEconomicIndexes, '2Y')) - 1 : null;
        const oneYInflation = proftability1Y ? (1 + proftability1Y) / (1 + this.calculateInflationByPeriod(treatedEconomicIndexes, '1Y')) - 1 : null;
        const threeMInflation = proftability3M ? (1 + proftability3M) / (1 + this.calculateInflationByPeriod(treatedEconomicIndexes, '3M')) - 1 : null;
        const oneMInflation = proftability1M ? (1 + proftability1M) / (1 + this.calculateInflationByPeriod(treatedEconomicIndexes, '1M')) - 1 : null;

        return {
            "ten_years": proftability10Y ? { nominal: proftability10Y, real: tenYInflation } : null,
            "five_years": proftability5Y ? { nominal: proftability5Y, real: fiveYInflation } : null,
            "two_years": proftability2Y ? { nominal: proftability2Y, real: twoYInflation } : null,
            "one_year": proftability1Y ? { nominal: proftability1Y, real: oneYInflation } : null,
            "three_months": proftability3M ? { nominal: proftability3M, real: threeMInflation } : null,
            "one_month": proftability1M ? { nominal: proftability1M, real: oneMInflation } : null,
        };
    }

    calculateInflationByPeriod(data: any[], period: string) {
        const periodMap = {
            '10Y': 10,
            '5Y': 5,
            '2Y': 2,
            '1Y': 1,
            '3M': 3,
            '1M': 1
        }

        const periodValue = periodMap[period];
        if (!periodValue) {
            throw new Error('Invalid period');
        }

        const filteredData = data.filter((index) => {
            const indexDate = new Date(index.date);
            const periodAgo = new Date();
            if (period.includes('Y')) {
                periodAgo.setFullYear(periodAgo.getFullYear() - periodValue);
            } else if (period.includes('M')) {
                periodAgo.setMonth(periodAgo.getMonth() - periodValue);
            } else {
                throw new Error('Invalid period format');
            }
            return indexDate >= periodAgo;
        });

        const factor = filteredData.reduce((acc, index) => {
            return acc * (1 + index.value / 100)
        }, 1);

        const accumulatedInflation = factor - 1;
        return accumulatedInflation;
    }

    getQuoteByPeriod(data: any[], period: string, debug = false) {
        const periodMap = {
            '10Y': 10,
            '5Y': 5,
            '2Y': 2,
            '1Y': 1,
            '3M': 3,
            '1M': 1
        }

        const periodValue = periodMap[period];
        if (!periodValue) {
            throw new Error('Invalid period');
        }

        const filteredData = data.filter((index) => {
            const indexDate = new Date(index.date);
            const periodAgo = new Date();
            if (period.includes('Y')) {
                periodAgo.setFullYear(periodAgo.getFullYear() - periodValue);
            } else if (period.includes('M')) {
                periodAgo.setMonth(periodAgo.getMonth() - periodValue);
            } else {
                throw new Error('Invalid period format');
            }

            return indexDate <= periodAgo;
        });

        return filteredData;
    }


    async validateTicker(ticker: string): Promise<boolean> {
        ticker = ticker.toUpperCase()

        const tickerData = await this.tickerRepository.createQueryBuilder("tickers")
            .where("tickers.ticker = :ticker", { ticker })
            .getOne();

        // console.log('tickerData:', tickerData, '\n ');
        
        return !!tickerData;
    }
}
