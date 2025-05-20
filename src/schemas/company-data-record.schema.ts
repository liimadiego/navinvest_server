import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CompanyDataRecordDocument = CompanyDataRecord & Document;

@Schema({
    timestamps: true,
    collection: 'companyData'
})
export class CompanyDataRecord {
    @Prop({ required: true })
    companyId: string;

    @Prop({ required: false, type: Object })
    balance: Record<string, any>;

    @Prop({ required: false, type: Object })
    incomes: Record<string, any>;

    @Prop({ required: false, type: Object })
    cash_flows: Record<string, any>;

    @Prop({ required: false, type: Object })
    market_ratios: Record<string, any>;

    @Prop({ required: false, type: Object })
    ratios: Record<string, any>;

    @Prop({ required: false, type: Object })
    shares: Record<string, any>;
}

export const CompanyDataRecordSchema = SchemaFactory.createForClass(CompanyDataRecord);