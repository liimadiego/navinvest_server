import { Controller, Post, Body, HttpStatus, HttpException, Req } from '@nestjs/common';
import { InvestTrackService } from './invest-track.service';
import { UserAction } from './invest-track-interface';
import { StarterPlan, ProPlan, PremiumPlan } from 'decorators/plans.decorator';
import { JwtHelper } from 'utils/jwt.service';

@Controller('invest-track')
export class InvestTrackController {
  constructor(
    private readonly investTrackService: InvestTrackService,
    private readonly jwtHelper: JwtHelper
  ) { }

  @PremiumPlan()
  @Post('get-ia-opinion')
  async getIAOpinion(@Body() body: { action: UserAction }, @Req() request: Request) {
    const userId = await this.jwtHelper.extractUserIdFromRequest(request);

    const { action } = body;

    if (!action) {
      throw new HttpException('Ação não pode estar vazia.', HttpStatus.BAD_REQUEST);
    }

    const response = await this.investTrackService.getIAOpinion(action, userId);

    try {
      return { success: true, data: response };
    } catch (error) {
      return { success: false, message: 'Erro ao processar a resposta da IA.', data: response };
    }
  }
}
