import { Module } from '@nestjs/common';
import { B3ImportService } from './b3-import.service';
import { B3ImportController } from './b3-import.controller';
import { UsersModule } from 'users/users.module';
import { PortfolioTransactionsModule } from 'portfolio-transactions/portfolio-transactions.module';
import { JwtHelper } from 'utils/jwt.service';

@Module({
  controllers: [B3ImportController],
  providers: [B3ImportService, JwtHelper],
  imports: [UsersModule, PortfolioTransactionsModule],
})
export class B3ImportModule {}
