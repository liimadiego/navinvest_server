import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HistoricalQuotesRecordDocument = HistoricalQuotesRecord & Document;

@Schema({
    timestamps: true,
    collection: 'historicalQuotes'
})
export class HistoricalQuotesRecord {
    @Prop({ required: true })
    tickerId: number;

    @Prop({ required: false, type: Object })
    quotes: Record<string, any>;
}

export const HistoricalQuotesRecordSchema = SchemaFactory.createForClass(HistoricalQuotesRecord);