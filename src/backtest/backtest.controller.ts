import { Body, Controller, BadRequestException, HttpStatus, Post } from "@nestjs/common";
import { BacktestService } from "./backtest.service";
import { BacktestRequestDto } from "./backtest.dto";
import { LanguagesService } from '../Utils/language';

@Controller('backtest')
export class BacktestController {
  private languagesService: LanguagesService = new LanguagesService();

  constructor(private backtestService: BacktestService) { }

  @Post('test')
  test(@Body() body: BacktestRequestDto) {
    const sumWeights = parseFloat(body.portfolio.reduce((sum, item) => sum + item.weight, 0).toFixed(5));
    if (sumWeights !== 1)
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: [ `${this.languagesService.getPhrase('PORTFOLIO_WEIGHTS_EXCEEDS_MAXIMUM')} (1): ${sumWeights}` ]
      });

    return this.backtestService.test(body);
  }
}