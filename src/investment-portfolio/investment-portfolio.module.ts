import { Module } from '@nestjs/common';
import { InvestmentPortfolioService } from './investment-portfolio.service';
import { InvestmentPortfolioController } from './investment-portfolio.controller';
import { UserEntity } from 'entities/user.entity';
import { InvestmentPortfolioEntity } from '../entities/investment-portfolio.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvestmentPortfolioEntity,
      UserEntity
    ]),
  ],
  controllers: [InvestmentPortfolioController],
  providers: [InvestmentPortfolioService],
})
export class InvestmentPortfolioModule { }
