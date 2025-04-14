import { Module } from '@nestjs/common';
import { InvestmentPortfolioService } from './investment-portfolio.service';
import { InvestmentPortfolioController } from './investment-portfolio.controller';
import { UserEntity } from 'entities/user.entity';
import { InvestmentPortfolioEntity } from '../entities/investment-portfolio.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { PortfolioDataRecord, PortfolioDataRecordSchema } from '../schemas/portfolio-data-record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PortfolioDataRecord.name, schema: PortfolioDataRecordSchema }]),
    TypeOrmModule.forFeature([
      InvestmentPortfolioEntity,
      UserEntity
    ]),
  ],
  controllers: [InvestmentPortfolioController],
  providers: [InvestmentPortfolioService],
  exports: [InvestmentPortfolioService],
})
export class InvestmentPortfolioModule { }
