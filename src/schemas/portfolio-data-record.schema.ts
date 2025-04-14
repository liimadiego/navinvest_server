import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PortfolioDataRecordDocument = PortfolioDataRecord & Document;

@Schema({ timestamps: true })
export class PortfolioDataRecord {
    @Prop({ required: true })
    portfolioId: string;

    @Prop({ required: true })
    date: Date;

    @Prop({ required: true })
    data: {
        month: string;
        year: string;
        totalAssets: number;
        totalInvested: number;
        currency: string;
    }[];
}

export const PortfolioDataRecordSchema = SchemaFactory.createForClass(PortfolioDataRecord);