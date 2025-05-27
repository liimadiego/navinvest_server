import { Body, Controller, HttpException, HttpStatus, Post, Req } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { JwtHelper } from 'utils/jwt.service';
import { SubscriptionDataReq } from './checkout.interface';
import { Public } from 'decorators/public.decorator';
import { AuthService } from 'auth/auth.service';
import { UsersService } from 'users/users.service';

@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly jwtHelper: JwtHelper,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) { }

  @Public()
  @Post('subscribe')
  async createSubscription(@Body() data: SubscriptionDataReq, @Req() request: any): Promise<any> {
    let userExists = true
    let userId = await this.jwtHelper.extractUserIdFromRequest(request);

    if (!data.billingAddress.neighborhood || data.billingAddress.neighborhood.trim() === "") {
      const response = await fetch(`https://viacep.com.br/ws/${data.billingAddress.zipCode}/json/`);
      if (!response.ok) {
        throw new HttpException('Erro ao consultar CEP', HttpStatus.BAD_REQUEST);
      }
      const viaApiData = await response.json();
      if (!viaApiData || !viaApiData.bairro) {
        throw new HttpException('CEP inválido ou não encontrado', HttpStatus.BAD_REQUEST);
      }
      data.billingAddress.neighborhood = viaApiData.bairro;
    }


    if (!userId) {
      userExists = false;
      const { fullName, email, phone, password } = data.general;
      if (!fullName || !email || !phone || !password) {
        throw new HttpException('Dados inválidos', HttpStatus.BAD_REQUEST);
      }

      const newUser = await this.authService.signUp(
        email,
        password,
        fullName,
        phone,
      );

      if (!newUser) {
        throw new HttpException('Erro ao criar usuário', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      userId = newUser.userId;
    }

    if (!userId) {
      throw new HttpException('Usuário não autenticado', HttpStatus.UNAUTHORIZED);
    }

    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    if (!data || !data.general || !data.billingAddress) {
      throw new HttpException('Dados inválidos', HttpStatus.BAD_REQUEST);
    }

    if (userExists) {
      data.general.email = user.email;
      data.general.phone = user.phone_number;
    }

    return this.checkoutService.createSubscription(userId, data, user);
  }
}
