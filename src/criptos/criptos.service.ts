import { Injectable } from '@nestjs/common';
import { CriptoEntity } from '../entities/criptos.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { HistoricalQuotesRecord, HistoricalQuotesRecordDocument } from '../schemas/historical-quotes.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { IsNull, Not, Repository } from 'typeorm';
import { TickersEntity } from 'entities/tickers.entity';

@Injectable()
export class CriptosService {
    constructor(
        @InjectRepository(CriptoEntity)
        private readonly criptoRepository: Repository<CriptoEntity>,
        @InjectModel(HistoricalQuotesRecord.name)
        private historicalQuotesRecordModel: Model<HistoricalQuotesRecordDocument>,
        @InjectRepository(TickersEntity)
        private readonly tickersRepository: Repository<TickersEntity>,
    ) { }

    async getCriptoByTicker(ticker: string): Promise<any> {
        const tickerData = await this.tickersRepository.findOne({
            where: { ticker, cripto: Not(IsNull()) },
            relations: ['cripto']
        });

        if (!tickerData) {
            throw new Error(`Ticker ${ticker} not found`);
        }

        const historicalQuotesData = await this.historicalQuotesRecordModel.findOne({ tickerId: tickerData.id });

        return {
            ticker,
            historicalQuotesData: historicalQuotesData && historicalQuotesData.quotes ? historicalQuotesData.quotes.reverse() : [],
            tickerData
        };
    }
}
