import { Controller, Get, Post, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtHelper } from 'utils/jwt.service';

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
}
