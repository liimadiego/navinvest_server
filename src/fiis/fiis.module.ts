import { Module } from '@nestjs/common';
import { FiisController } from './fiis.controller';
import { FiisService } from './fiis.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FiisData, FiisDataSchema } from '../schemas/fiis-data.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FiisData.name, schema: FiisDataSchema },
    ]),
  ],
  controllers: [ FiisController ],
  providers: [ FiisService ]
})
export class FiisModule {};