import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { TickersEntity } from 'entities/tickers.entity';
import { Model } from 'mongoose';
import { FiisData } from 'schemas/fiis-data.schema';
import { Repository } from 'typeorm';

@Injectable()
export class FiisService {
  constructor(
    @InjectRepository(TickersEntity)
    private readonly tickersRepository: Repository<TickersEntity>,

    @InjectModel(FiisData.name)
    private fiisModel: Model<FiisData>,
  ) { }

  async getFiiByTicker (ticker: string): Promise<any> {
    const tickerData = await this.tickersRepository.findOne({
      where: { ticker },
      relations: ['company']
    });
    if (!tickerData) throw new Error('Ticker not found');

    return tickerData;

    // const fii = await this.fiisModel.findOne({ "CodigoNegociacao": ticker }, { _id: 0 }).exec();
    // if (!fii) throw new Error(`FII with ticker ${ticker} not found`);
    // return fii;
  }
};