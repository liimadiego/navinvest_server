import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { JwtHelper } from 'utils/jwt.service';
import { AuthModule } from 'auth/auth.module';
import { UsersModule } from 'users/users.module';

@Module({
  controllers: [CheckoutController],
  providers: [CheckoutService, JwtHelper],
  imports: [AuthModule, UsersModule],
})
export class CheckoutModule { }
