import { Body, Query, Controller, HttpException, HttpStatus, Post, Get } from '@nestjs/common';
import { InvestorProfileService } from './investor-profile.service';
import { investorProfileAnswers } from './investor-profile-interface';
import { StarterPlan, ProPlan, PremiumPlan } from 'decorators/plans.decorator';

@Controller('investor-profile')
export class InvestorProfileController {
  constructor(private readonly investorProfileService: InvestorProfileService) { }

  @Post('create')
  async saveInvestorProfile(@Body() body: { investor_profile: investorProfileAnswers, user_id: string }) {

    const { investor_profile, user_id } = body;

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

    if (!user_id) {
      missingFields.push('user_id');
    }

    if (missingFields.length > 0) {
      throw new HttpException(`Campos faltando: ${missingFields.join(', ')}`, HttpStatus.BAD_REQUEST);
    }

    const uuid4 = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');
    if (!uuid4.test(user_id)) {
      throw new HttpException('Campo user_id não é um UUID4 válido.', HttpStatus.BAD_REQUEST);
    }

    const response = await this.investorProfileService.saveInvestorProfile(investor_profile, user_id);

    return { success: true, data: response };
  }

  @PremiumPlan()
  @Get('get-investment-plan')
  async getInvestmentPlan(@Query() query: { user_id: string }) {

    const { user_id } = query;

    if (!user_id) {
      throw new HttpException('Campo user_id é obrigatório.', HttpStatus.BAD_REQUEST);
    }

    const uuid4 = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');
    if (!uuid4.test(user_id)) {
      throw new HttpException('Campo user_id não é um UUID4 válido.', HttpStatus.BAD_REQUEST);
    }

    const response = await this.investorProfileService.getInvestmentPlan(user_id);

    return { success: true, data: response };
  }

}
