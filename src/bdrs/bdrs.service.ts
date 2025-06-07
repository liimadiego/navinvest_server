import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TickersEntity } from '../entities/tickers.entity';
import { IsNull, Not, Repository } from 'typeorm';
import { BdrEntity } from '../entities/bdrs.entity';
import { HistoricalQuotesRecord, HistoricalQuotesRecordDocument } from '../schemas/historical-quotes.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class BdrsService {
    constructor(
        @InjectRepository(BdrEntity)
        private readonly bdrRepository: Repository<BdrEntity>,
        @InjectRepository(TickersEntity)
        private readonly tickersRepository: Repository<TickersEntity>,
        @InjectModel(HistoricalQuotesRecord.name)
        private historicalQuotesRecordModel: Model<HistoricalQuotesRecordDocument>,
    ) { }

    async getBdrByTicker(ticker: string): Promise<any> {
        const tickerData = await this.tickersRepository.findOne({
            where: { ticker, bdr: Not(IsNull()) },
            relations: ['bdr']
        });

        if (!tickerData) {
            throw new Error(`Ticker ${ticker} not found`);
        }

        const historicalQuotesData = await this.historicalQuotesRecordModel.findOne({ tickerId: tickerData.id });

        return {
            ticker,
            historicalQuotesData: historicalQuotesData && historicalQuotesData.quotes ? historicalQuotesData.quotes : [],
            tickerData
        };
    }
}
