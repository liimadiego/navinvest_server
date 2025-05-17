import { Body, Controller, HttpException, HttpStatus, Post, Req } from '@nestjs/common';
import { AssetReportAiService } from './asset-report-ai.service';
import { log } from 'console';
import { StarterPlan, ProPlan, PremiumPlan } from 'decorators/plans.decorator';
import { JwtHelper } from 'utils/jwt.service';

@Controller('asset-report-ai')
export class AssetReportAiController {
  constructor(
    private readonly assetReportAiService: AssetReportAiService,
    private readonly jwtHelper: JwtHelper,
  ) { }

  @PremiumPlan()
  @Post('generate-report')
  async generateReport(@Body() req: any, @Req() request: any) {
    try {
      const userId = await this.jwtHelper.extractUserIdFromRequest(request);

      if (!userId) {
        throw new HttpException('Usuário não encontrado', HttpStatus.UNAUTHORIZED);
      }

      const { company_data } = req;

      const report = await this.assetReportAiService.generateReport(company_data, userId);
      if (!report) {
        throw new Error('Erro ao gerar o relatório.');
      }
      return report;
    } catch (error) {
      throw new HttpException(error, error.status);
    }
  }
}
