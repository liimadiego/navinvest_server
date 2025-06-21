import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TagEntity } from '../entities/tag.entity';
import { TickersEntity } from '../entities/tickers.entity';
import { TreasuriesEntity } from 'entities/treasuries.entity';
import { EconomicIndexesEntity } from 'entities/economic-indexes.entity';
import { DividendEntity } from 'entities/dividends.entity';
import { Repository, Raw } from 'typeorm';
import { CompaniesService } from '../companies/companies.service';
import { CriptosService } from 'criptos/criptos.service';
import { FiisService } from 'fiis/fiis.service';
import { BdrsService } from 'bdrs/bdrs.service';
import { EtfsService } from 'etfs/etfs.service';
import {
    HistoricalQuotesRecord,
    HistoricalQuotesRecordDocument
} from '../schemas/historical-quotes.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

import { existsSync } from 'fs'

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
        @InjectRepository(DividendEntity)
        private readonly dividendRepository: Repository<DividendEntity>,
        private readonly companiesService: CompaniesService,
        private readonly criptosService: CriptosService,
        private readonly fiisService: FiisService,
        private readonly bdrsService: BdrsService,
        private readonly etfsService: EtfsService
    ) { }

    async getTickers(limit: number = 0, query: string = "", type = ''): Promise<TickersEntity[] | TreasuriesEntity[]> {
        const justBrStock = type === 'br_stock';
        if (justBrStock) {
            type = 'stock';
        }

        let queryBuilder = type === 'treasury' ?
            this.treasuryRepository.createQueryBuilder("treasuries") :
            this.tickerRepository.createQueryBuilder("tickers");

        if (query) {
            if (type === 'treasury') {
                queryBuilder = queryBuilder.where("(LOWER(treasuries.name) LIKE LOWER(:query))", { query: `%${query}%` });
            } else {
                queryBuilder = queryBuilder.where("(LOWER(tickers.ticker) LIKE LOWER(:query) OR LOWER(tickers.asset_name) LIKE LOWER(:query))", { query: `%${query}%` });
            }
        }

        if (type && type !== 'treasury') {
            queryBuilder = queryBuilder.andWhere("tickers.asset_type = :type", { type });
            if (justBrStock) {
                queryBuilder = queryBuilder.andWhere("tickers.currency = :currency", { currency: 'BRL' });
            }
        }

        if (limit > 0) {
            queryBuilder = queryBuilder.take(limit);
        }

        const tickersResult = await queryBuilder.getMany();

        if (type !== 'treasury') {
            const tickers = tickersResult as TickersEntity[];
            const ethIndex = tickers.findIndex(ticker => ticker.ticker === 'ETH');
            if (ethIndex !== -1) {
                const ethTicker = tickers.splice(ethIndex, 1)[0];
                tickers.unshift(ethTicker);
            }

            const btcIndex = tickers.findIndex(ticker => ticker.ticker === 'BTC');
            if (btcIndex !== -1) {
                const btcTicker = tickers.splice(btcIndex, 1)[0];
                tickers.unshift(btcTicker);
            }
        }

        tickersResult.forEach(t => {
            if (t.asset_image_url == null) {
                if (existsSync(`/assets/tickers/${t.ticker}.jpg`))
                    t.asset_image_url = `/assets/tickers/${t.ticker}.jpg`;
                else
                    t.asset_image_url = `/assets/tickers/default.svg`;
            }
        });

        // console.log('tickersResult:', tickersResult, '\n ');

        return tickersResult;

    }

    async getTickersToSearchNews(limit = 0, testMode = false): Promise<TickersEntity[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let tickers = this.tickerRepository.createQueryBuilder("tickers")
            .where("tickers.latest_search_news < :today OR tickers.latest_search_news IS NULL", { today })
            .andWhere("tickers.currency = :currency", { currency: 'BRL' });

        if (testMode) {
            tickers = tickers.andWhere("tickers.ticker IN (:...tickers)",
                { tickers: ['PETR4', 'VALE3', 'ITUB4', 'BBDC3', 'BBDC4', 'ABEV3', 'BBAS3', 'WEGE3'] }
            );
        }

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

        if (tickerData && tickerData.asset_type === 'cripto') {
            historicalQuotesData.quotes = historicalQuotesData.quotes.reverse().map((quote: any) => {
                return {
                    ...quote,
                    adj_close: quote.close_brl ? Number(quote.close_brl) : null,
                    close: quote.close_brl ? Number(quote.close_brl) : null
                };
            });
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

        return !!tickerData;
    }

    async getAllDividends(month: number, year: number): Promise<DividendEntity[]> {
        if (!month || !year) {
            throw new Error('Month and year are required');
        }

        const dividends = await this.dividendRepository.find({
            select: {
                id: true,
                ticker: true,
                ex_date: true,
                payable_date: true,
                adj_amount: true,
                reit: {
                    name: true,
                },
                company: {
                    name: true,
                    trade_name: true,
                },
                tickerInfo: {
                    currency: true,
                    current_price: true,
                }
            },
            where: {
                payable_date: Raw(alias => `EXTRACT(MONTH FROM ${alias}) = ${month} AND EXTRACT(YEAR FROM ${alias}) = ${year}`)
            },
            relations: ['reit', 'company', 'tickerInfo'],
            order: {
                payable_date: 'ASC'
            }
        })

        return dividends;
    }

    async getTickerData(ticker: string): Promise<any> {
        if (!ticker) {
            throw new Error('Ticker is required');
        }

        ticker = ticker.toUpperCase();

        const tickerData = await this.tickerRepository.createQueryBuilder("tickers")
            .where("tickers.ticker = :ticker", { ticker })
            .getOne();

        if (!tickerData) {
            throw new Error('Ticker not found');
        }

        const tickerType = tickerData.asset_type;
        const tickerCurrency = tickerData.currency;

        if (tickerType === 'stock' && tickerCurrency === 'BRL') {
            const companyData = await this.companiesService.getBRCompanyByTicker(ticker);
            if (!companyData) {
                throw new Error('Company not found for the given ticker');
            }

            const proftability = await this.getProftabilityByTicker(ticker);

            return {
                assetType: `br_${tickerType}`,
                ...companyData,
                proftability
            };
        }

        if (tickerType === 'stock' && tickerCurrency === 'USD') {
            const stockData = await this.companiesService.getUSCompanyByTicker(ticker);
            const proftability = await this.getProftabilityByTicker(ticker);
            if (!stockData) {
                throw new Error('Company not found for the given ticker');
            }
            return {
                assetType: `us_${tickerType}`,
                ...stockData,
                proftability
            };
        }

        if (tickerType === 'cripto') {
            const criptoData = await this.criptosService.getCriptoByTicker(ticker);
            if (!criptoData) {
                throw new Error('Cripto not found');
            }
            const proftability = await this.getProftabilityByTicker(ticker);

            return {
                assetType: tickerType,
                ...criptoData,
                proftability
            };
        }

        if (tickerType === 'fii') {
            const fiiData = await this.fiisService.getFiiByTicker(ticker);
            if (!fiiData) {
                throw new Error('FII not found');
            }

            const proftability = await this.getProftabilityByTicker(ticker);

            return {
                assetType: tickerType,
                ...fiiData,
                proftability
            };
        }

        if (tickerType === 'bdr') {
            const bdrData = await this.bdrsService.getBdrByTicker(ticker);
            if (!bdrData) {
                throw new Error('BDR not found');
            }
            const proftability = await this.getProftabilityByTicker(ticker);

            return {
                assetType: tickerType,
                ...bdrData,
                proftability
            };
        }

        if (tickerType === 'etf') {
            const etfData = await this.etfsService.getEtfByTicker(ticker);
            if (!etfData) {
                throw new Error('ETF not found');
            }
            const proftability = await this.getProftabilityByTicker(ticker);

            return {
                assetType: tickerType,
                ...etfData,
                proftability
            };
        }

    }
}
