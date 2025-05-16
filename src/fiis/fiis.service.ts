import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FiisData } from 'schemas/fiis-data.schema';

@Injectable()
export class FiisService {
  constructor(
    @InjectModel(FiisData.name)
    private fiisModel: Model<FiisData>,
  ) { }

  async getFiiByTicker (ticker: string): Promise<any> {
    const fii = await this.fiisModel.findOne({ "CodigoNegociacao": ticker }, { _id: 0 }).exec();
    if (!fii) throw new Error(`FII with ticker ${ticker} not found`);
    return fii;
  }
};