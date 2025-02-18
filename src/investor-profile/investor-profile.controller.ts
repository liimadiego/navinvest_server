import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { InvestorProfileService } from './investor-profile.service';
import { investorProfileAnswers } from './investor-profile-interface';

@Controller('investor-profile')
export class InvestorProfileController {
  constructor(private readonly investorProfileService: InvestorProfileService) { }

  @Post('create')
  async saveInvestorProfile(@Body() body: { investorProfile: investorProfileAnswers, user_id: string }) {

    const { investorProfile, user_id } = body;

    if (!investorProfile) {
      throw new HttpException('Campo investorProfile é obrigatório.', HttpStatus.BAD_REQUEST);
    }

    let missingFields = [];

    const requiredFields = ['experience', 'risk_tolerance', 'investment_horizon', 'market_reaction', 'investment_goal'];

    for (let field of requiredFields) {
      if (!investorProfile[field]) {
        missingFields.push(field);
      }
    }

    if (!user_id) {
      missingFields.push('user_id');
    }

    if (missingFields.length > 0) {
      throw new HttpException(`Campos faltando: ${missingFields.join(', ')}`, HttpStatus.BAD_REQUEST);
    }

    const response = await this.investorProfileService.saveInvestorProfile(investorProfile, user_id);

    return { success: true, data: response };
  }

}
