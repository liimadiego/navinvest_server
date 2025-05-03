import { Injectable } from '@nestjs/common';
import { CompanyEntity } from '../entities/companies.entity';
import { TickersEntity } from 'entities/tickers.entity';
import { DividendEntity } from 'entities/dividends.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    StockDataRecord,
    StockDataRecordDocument
} from '../schemas/stock-data-record.schema';
import {
    HistoricalDividendYieldRecord,
    HistoricalDividendYieldRecordDocument
} from '../schemas/historical-dividend-yield.schema';
import {
    HistoricalQuotesRecord,
    HistoricalQuotesRecordDocument
} from '../schemas/historical-quotes.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class CompaniesService {
    constructor(
        @InjectRepository(CompanyEntity)
        private readonly companyRepository: Repository<CompanyEntity>,
        @InjectModel(StockDataRecord.name)
        private stockDataRecordModel: Model<StockDataRecordDocument>,
        @InjectRepository(TickersEntity)
        private readonly tickersRepository: Repository<TickersEntity>,
        @InjectModel(HistoricalDividendYieldRecord.name)
        private historicalDividendYieldRecordModel: Model<HistoricalDividendYieldRecordDocument>,
        @InjectModel(HistoricalQuotesRecord.name)
        private historicalQuotesRecordModel: Model<HistoricalQuotesRecordDocument>,
        @InjectRepository(DividendEntity)
        private readonly dividendsRepository: Repository<DividendEntity>
    ) { }

    async findAll(): Promise<CompanyEntity[]> {
        return this.companyRepository.find();
    }

    async getCompanyByTicker(ticker: string): Promise<any> {
        const tickerData = await this.tickersRepository.findOne({
            where: { ticker },
            relations: ['company']
        });

        if (!tickerData) {
            throw new Error('Ticker not found');
        }
        const companyId = tickerData.company.id;

        const todayOneYearAgo = new Date();
        todayOneYearAgo.setFullYear(todayOneYearAgo.getFullYear() - 1);

        const totalDividendsLast12Months: any = await this.dividendsRepository
            .createQueryBuilder('dividends')
            .select('SUM(dividends.adj_amount)', 'totalDividendsLast12Months')
            .where('dividends.company.id = :companyId', { companyId })
            .andWhere('dividends.ex_date >= CURRENT_DATE - INTERVAL \'12 months\'')
            .andWhere('dividends.ticker = :ticker', { ticker })
            .getRawOne();

        const totalDividendsLast12MonthsValue = totalDividendsLast12Months.totalDividendsLast12Months || 0;
        let dividendYieldLast12Months = 0;

        if (totalDividendsLast12MonthsValue > 0) {
            dividendYieldLast12Months = (totalDividendsLast12MonthsValue / tickerData.current_price);
        }

        const companyData = await this.stockDataRecordModel.findOne({ companyId });
        const historicalDividendYieldData = await this.historicalDividendYieldRecordModel.findOne({ tickerId: tickerData.id });
        const historicalQuotesData = await this.historicalQuotesRecordModel.findOne({ tickerId: tickerData.id });
        let historicalQuotesObj: any = {};

        if (historicalQuotesData) {
            historicalQuotesObj = historicalQuotesData.toObject().quotes.slice(-120);
        }

        const formattedStockData: any = {};
        let companyDataObj: any = {};

        let historicalDividendYieldObj: any = {};

        if (!companyData) {
            throw new Error('Company data not found');
        }

        companyDataObj = companyData.toObject();

        const marketRatiosFiltered = companyDataObj.market_ratios.filter((item: any) => {
            return item.ticker === tickerData.ticker;
        });

        Object.keys(companyDataObj).forEach((key) => {
            if (key === 'market_ratios' && Array.isArray(marketRatiosFiltered) && marketRatiosFiltered.length > 0) {
                marketRatiosFiltered.sort((a: any, b: any) => {
                    return new Date(b.reference_date).getTime() - new Date(a.reference_date).getTime();
                });
                formattedStockData[key] = marketRatiosFiltered[0];
            } else if (Array.isArray(companyDataObj[key]) && companyDataObj[key].length > 0) {
                formattedStockData[key] = companyDataObj[key][0];
            } else {
                formattedStockData[key] = companyDataObj[key];
            }
        });

        if (historicalDividendYieldData) {
            historicalDividendYieldObj = historicalDividendYieldData.toObject();
        }

        delete formattedStockData._id;
        delete formattedStockData.companyId;

        return {
            companyMarketData: { ...formattedStockData, dividendYieldLast12Months },
            tickerCompanyInfo: tickerData,
            historicalDividendYieldData: historicalDividendYieldObj,
            historicalQuotesData: historicalQuotesObj,
        };
    }
}
