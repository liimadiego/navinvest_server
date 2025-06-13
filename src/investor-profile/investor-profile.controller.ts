import { Body, Query, Controller, HttpException, HttpStatus, Post, Get, Req } from '@nestjs/common';
import { InvestorProfileService } from './investor-profile.service';
import { investorProfileAnswers } from './investor-profile-interface';
import { PremiumPlan } from 'decorators/plans.decorator';
import { JwtHelper } from 'utils/jwt.service';

@Controller('investor-profile')
export class InvestorProfileController {
  constructor(
    private readonly investorProfileService: InvestorProfileService,
    private readonly jwtHelper: JwtHelper
  ) { }

  @Post('create')
  async saveInvestorProfile(@Body() body: { investor_profile: investorProfileAnswers }, @Req() request: any) {
    const userId = await this.jwtHelper.extractUserIdFromRequest(request);
    const { investor_profile } = body;

    if (!investor_profile) {
      throw new HttpException('Campo investor_profile é obrigatório.', HttpStatus.BAD_REQUEST);
    }

    let missingFields = [];

    const requiredFields = ['experience', 'risk_tolerance', 'investment_horizon', 'market_reaction', 'investment_goal'];

    for (let field of requiredFields) {
      if (!investor_profile[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new HttpException(`Campos faltando: ${missingFields.join(', ')}`, HttpStatus.BAD_REQUEST);
    }

    const uuid4 = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');
    if (!uuid4.test(userId)) {
      throw new HttpException('Campo userId não é um UUID4 válido.', HttpStatus.BAD_REQUEST);
    }

    const response = await this.investorProfileService.saveInvestorProfile(investor_profile, userId);

    return { success: true, data: response };
  }

  @Get('get-investor-profile')
  async getInvestorProfile(@Req() request: any) {
    const userId = await this.jwtHelper.extractUserIdFromRequest(request);

    const uuid4 = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');
    if (!uuid4.test(userId)) {
      throw new HttpException('Campo user_id não é um UUID4 válido.', HttpStatus.BAD_REQUEST);
    }

    const response = await this.investorProfileService.getInvestorProfile(userId);

    return response;
  }

  @PremiumPlan()
  @Get('get-investment-plan')
  async getInvestmentPlan(@Req() request: any) {
    const userId = await this.jwtHelper.extractUserIdFromRequest(request);

    const uuid4 = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');
    if (!uuid4.test(userId)) {
      throw new HttpException('Campo user_id não é um UUID4 válido.', HttpStatus.BAD_REQUEST);
    }

    const response = await this.investorProfileService.getInvestmentPlan(userId);

    return { success: true, data: response };
  }

}
