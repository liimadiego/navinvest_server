import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HistoricalFundsQuotesRecordDocument = HistoricalFundsQuotesRecord & Document;

@Schema({
    timestamps: true,
    collection: 'fundData'
})
export class HistoricalFundsQuotesRecord {
    @Prop({ required: true })
    fundId: string;

    @Prop({ required: false, type: Object })
    quotes: Record<string, any>;
}

export const HistoricalFundsQuotesRecordSchema = SchemaFactory.createForClass(HistoricalFundsQuotesRecord);