import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { AssetReportAiService } from './asset-report-ai.service';
import { log } from 'console';

@Controller('asset-report-ai')
export class AssetReportAiController {
  constructor(private readonly assetReportAiService: AssetReportAiService) { }

  @Post('generate-report')
  async generateReport(@Body() req: any): Promise<any> {
    try {
      const { company_data } = req;

      const report = await this.assetReportAiService.generateReport(company_data);
      if (!report) {
        throw new Error('Erro ao gerar o relatório.');
      }
      return report;
    } catch (error) {
      log("error", error);
      throw new HttpException(
        { message: 'Erro ao gerar relatório', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
