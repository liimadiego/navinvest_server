import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { JwtHelper } from 'utils/jwt.service';

@Module({
  controllers: [CheckoutController],
  providers: [CheckoutService, JwtHelper],
})
export class CheckoutModule { }
