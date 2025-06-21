import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { TickersEntity } from 'entities/tickers.entity';
import { Model } from 'mongoose';
import { HistoricalQuotesRecord, HistoricalQuotesRecordDocument } from 'schemas/historical-quotes.schema';
import { IsNull, Not, Repository } from 'typeorm';

@Injectable()
export class EtfsService {
    constructor(
        @InjectModel(HistoricalQuotesRecord.name)
        private historicalQuotesRecordModel: Model<HistoricalQuotesRecordDocument>,
        @InjectRepository(TickersEntity)
        private readonly tickersRepository: Repository<TickersEntity>,
    ) { }

    async getEtfByTicker(ticker: string): Promise<any> {
        const tickerData = await this.tickersRepository.findOne({
            where: { ticker, etf: Not(IsNull()) },
            relations: ['etf']
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
