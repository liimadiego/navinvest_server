import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
class Property {
  @Prop()
  Nome: string;

  @Prop()
  Endereco: string;

  @Prop()
  Area: string;

  @Prop()
  NumUnidades: string;

  @Prop()
  OutrasCaractRelevantes: string;

  @Prop()
  PercentVacancia: string;

  @Prop()
  PercentInadimplencia: string;

  @Prop()
  PercentReceitasFII: string;
};

@Schema({ _id: false })
class LeaseContractsByExpiration {
  @Prop()
  up_to_3_months: number;
  
  @Prop()
  from_3_to_6_months: number;
  
  @Prop()
  from_6_to_12_months: number;
  
  @Prop()
  from_12_to_24_months: number;
  
  @Prop()
  from_24_to_36_months: number;
  
  @Prop()
  over_36_months: number;
  
  @Prop()
  undetermined_expiration: number;
};

@Schema({ _id: false })
class LeaseContractsByIndexer {
  @Prop()
  IGPM: number;
  
  @Prop()
  INPC: number;
  
  @Prop()
  IPCA: number;
  
  @Prop()
  INCC: number;
};

@Schema({ _id: false })
class HistoryElement {
  @Prop()
  reitId: string;
  
  @Prop()
  reference_year: number;
  
  @Prop()
  patrimonial_value: number;
  
  @Prop()
  patrimonial_value_per_share: number;
  
  @Prop()
  vacancy: number;
  
  @Prop()
  number_of_shareholders: number;
  
  @Prop()
  shares_issued: number;
  
  @Prop()
  properties: Property[];
  
  @Prop()
  lease_contracts_by_expiration: LeaseContractsByExpiration;
  
  @Prop()
  lease_contracts_by_indexer: LeaseContractsByIndexer;
  
  @Prop()
  close_price: number;
  
  @Prop()
  pvp: number;
  
  @Prop()
  dividend_yield: number;
  
  @Prop()
  market_capitalization: number;
};

@Schema({ collection: 'fiisData' })
export class FiisData extends Document {
  @Prop({ required: true })
  reitId: string;
  
  @Prop()
  history: HistoryElement[];
};

export const FiisDataSchema = SchemaFactory.createForClass(FiisData);