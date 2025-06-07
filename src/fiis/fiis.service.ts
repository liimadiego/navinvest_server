import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { DividendEntity } from 'entities/dividends.entity';
import { TickersEntity } from 'entities/tickers.entity';
import { Model } from 'mongoose';
import { FiisData } from 'schemas/fiis-data.schema';
import { HistoricalQuotesRecord, HistoricalQuotesRecordDocument } from 'schemas/historical-quotes.schema';
import { Repository } from 'typeorm';

@Injectable()
export class FiisService {
  constructor(
    @InjectRepository(TickersEntity)
    private readonly tickersRepository: Repository<TickersEntity>,

    @InjectRepository(DividendEntity)
    private readonly dividendsRepository: Repository<DividendEntity>,

    @InjectModel(FiisData.name)
    private fiisModel: Model<FiisData>,
    @InjectModel(HistoricalQuotesRecord.name)
    private historicalQuotesRecordModel: Model<HistoricalQuotesRecordDocument>
  ) { }

  async getFiiByTicker(ticker: string): Promise<any> {
    const tickerData = await this.tickersRepository.findOne({
      where: { ticker },
      relations: ['reit']
    });
    if (!tickerData) throw new Error('Ticker not found');

    const reitId = tickerData.reit.id;

    const fii = await this.fiisModel.findOne({ reitId }, { _id: 0 }).exec();
    if (!fii) throw new Error(`FII with ticker ${ticker} not found`);

    const historicalQuotesData_ = await this.historicalQuotesRecordModel.findOne({ tickerId: tickerData.id });

    const totalDividendsLast12Months: any = await this.dividendsRepository
      .createQueryBuilder('dividends')
      .select('SUM(dividends.adj_amount)', 'totalDividendsLast12Months')
      .where('dividends.reit.id = :reitId', { reitId })
      .andWhere('dividends.ex_date >= CURRENT_DATE - INTERVAL \'12 months\'')
      .andWhere('dividends.ticker = :ticker', { ticker })
      .getRawOne();

    const dividendYieldPast12m = parseFloat((totalDividendsLast12Months.totalDividendsLast12Months / tickerData.current_price).toFixed(4));
    const historicalQuotesData = historicalQuotesData_ && historicalQuotesData_.quotes ? historicalQuotesData_.quotes : [];

    return { dividendYieldPast12m, fii, historicalQuotesData, tickerData };
  }
};