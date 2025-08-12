import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtHelper } from 'utils/jwt.service';
import { isValidCPF } from 'utils/cpf.utils';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtHelper: JwtHelper
  ) { }

  @Get('/token-usage')
  async getTokenUsageByUserId(@Req() req: any) {
    const userId = await this.jwtHelper.extractUserIdFromRequest(req);
    if (!userId) {
      return { error: 'User not found' };
    }

    return this.usersService.getTokenUsageByUserId(userId);
  }

  //requestSubscriptionCancellation
  @Post('/request-subscription-cancellation')
  async requestSubscriptionCancellation(@Req() req: any) {
    const userId = await this.jwtHelper.extractUserIdFromRequest(req);
    if (!userId) {
      return { error: 'User not found' };
    }

    return this.usersService.requestSubscriptionCancellation(userId);
  }
  
  @Post('/set-cpf')
  async setUserCpf(@Body() body: any, @Req() req: any) {
    const userId = await this.jwtHelper.extractUserIdFromRequest(req);
    if (!userId) {
      return { error: 'User not found' };
    }

    const userCpf = body.cpf;
    if (!isValidCPF(userCpf)) {
      return { error: 'Invalid CPF format' };
    }

    return this.usersService.setUserCpf(userId, userCpf);
  }
}
