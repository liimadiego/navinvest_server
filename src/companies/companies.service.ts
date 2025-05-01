import { Injectable } from '@nestjs/common';
import { CompanyEntity } from '../entities/companies.entity';
import { TickersEntity } from 'entities/tickers.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockDataRecord, StockDataRecordDocument } from '../schemas/stock-data-record.schema';
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
        private readonly tickersRepository: Repository<TickersEntity>
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

        const companyData = await this.stockDataRecordModel.findOne({ companyId });

        const formattedStockData: any = {};
        const companyDataObj = companyData.toObject();

        const marketRatiosFiltered = companyDataObj.market_ratios.filter((item) => {
            return item.ticker === tickerData.ticker;
        });

        Object.keys(companyDataObj).forEach((key) => {
            if (key === 'market_ratios' && Array.isArray(marketRatiosFiltered) && marketRatiosFiltered.length > 0) {
                formattedStockData[key] = marketRatiosFiltered[0];
            } else if (Array.isArray(companyDataObj[key]) && companyDataObj[key].length > 0) {
                formattedStockData[key] = companyDataObj[key][0];
            } else {
                formattedStockData[key] = companyDataObj[key];
            }
        });

        delete formattedStockData._id;
        delete formattedStockData.companyId;

        return {
            companyHistoricalData: formattedStockData,
            tickerCompanyInfo: tickerData,
        };
    }
}
