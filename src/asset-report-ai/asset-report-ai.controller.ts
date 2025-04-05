import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { AssetReportAiService } from './asset-report-ai.service';

@Controller('asset-report-ai')
export class AssetReportAiController {
  constructor(private readonly assetReportAiService: AssetReportAiService) { }

  @Post('generate-report')
  async generateReport(@Body() req: any): Promise<any> {
    try {
      const { company_data } = req;

      if (!company_data || !company_data.ticker) {
        throw new Error('Os dados da empresa não foram encontrados.');
      }

      const report = await this.assetReportAiService.generateReport(company_data);
      if (!report) {
        throw new Error('Erro ao gerar o relatório.');
      }
      return report;
    } catch (error) {
      throw new HttpException(
        { message: 'Erro ao gerar relatório', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
