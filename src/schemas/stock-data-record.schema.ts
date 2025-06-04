import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StockDataRecordDocument = StockDataRecord & Document;

@Schema({
    timestamps: true,
    collection: 'stockData'
})
export class StockDataRecord {
    @Prop({ required: true })
    stockId: string;

    @Prop({ required: false, type: Object })
    indicators: Record<string, any>;
}

export const StockDataRecordSchema = SchemaFactory.createForClass(StockDataRecord);