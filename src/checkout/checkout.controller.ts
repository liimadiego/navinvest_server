import { Body, Controller, HttpException, HttpStatus, Post, Req } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { JwtHelper } from 'utils/jwt.service';
import { SubscriptionDataReq } from './checkout.interface';

@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly jwtHelper: JwtHelper,
  ) { }

  @Post('subscribe')
  async createSubscription(@Body() data: SubscriptionDataReq, @Req() request: any): Promise<any> {
    const userId = await this.jwtHelper.extractUserIdFromRequest(request);

    if (!userId) {
      throw new HttpException('Usuário não encontrado', HttpStatus.UNAUTHORIZED);
    }

    if (!data || !data.general || !data.billingAddress) {
      throw new HttpException('Dados inválidos', HttpStatus.BAD_REQUEST);
    }

    return this.checkoutService.createSubscription(userId, data);
  }
}
