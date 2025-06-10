import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HistoricalTreasuryQuotesRecordDocument = HistoricalTreasuryQuotesRecord & Document;

@Schema({
    timestamps: true,
    collection: 'historicalTreasuryQuotes'
})
export class HistoricalTreasuryQuotesRecord {
    @Prop({ required: true })
    treasuryId: number;

    @Prop({ required: false, type: Object })
    quotes: Record<string, any>;
}

export const HistoricalTreasuryQuotesRecordSchema = SchemaFactory.createForClass(HistoricalTreasuryQuotesRecord);