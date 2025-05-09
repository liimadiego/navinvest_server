import { Prop, Schema } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';

@Schema({ _id: false })
export class MessageHistoric {
    @Prop({ required: true })
    id: string;

    @Prop({ required: true, type: MongooseSchema.Types.Mixed })
    answer: any;

    @Prop({ required: true })
    messageType: string;

    @Prop({ required: true })
    role: string;

    @Prop({ required: true })
    senderId: string;

    @Prop({ required: true })
    createdAt: string;
}
