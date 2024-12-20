import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InvestmentAssistantModule } from './investment-assistant/investment-assistant.module';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [InvestmentAssistantModule],
})
export class AppModule { }
