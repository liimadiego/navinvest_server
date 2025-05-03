import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HistoricalDividendYieldRecordDocument = HistoricalDividendYieldRecord & Document;

@Schema({
    timestamps: true,
    collection: 'historicalDividendYield'
})
export class HistoricalDividendYieldRecord {
    @Prop({ required: true })
    tickerId: number;

    @Prop({ required: false, type: Object })
    dividendYields: Record<string, any>;
}

export const HistoricalDividendYieldRecordSchema = SchemaFactory.createForClass(HistoricalDividendYieldRecord);