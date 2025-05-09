import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { MessageHistoric } from './message-historic.schema';

export type InvestmentAssistantChatRecordDocument = InvestmentAssistantChatRecord & Document;

@Schema({
    timestamps: true,
    collection: 'investmentAssistantChat'
})
export class InvestmentAssistantChatRecord {
    @Prop({ required: true })
    user_id: string;

    @Prop({ required: true })
    chat_id: string;

    @Prop({ type: [MessageHistoric], default: [] })
    messages: MessageHistoric[];
}

export const InvestmentAssistantChatRecordSchema = SchemaFactory.createForClass(InvestmentAssistantChatRecord);
