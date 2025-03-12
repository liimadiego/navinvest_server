import { Body, Controller, BadRequestException, HttpStatus, Post } from "@nestjs/common";
import { BacktestService } from "./backtest.service";
import { BacktestRequestDto } from "./backtest.dto";

@Controller('backtest')
export class BacktestController {
  constructor(private backtestService: BacktestService) { }

  @Post('test')
  test(@Body() body: BacktestRequestDto) {
    const sumWeights = parseFloat(body.portfolio.reduce((sum, item) => sum + item.weight, 0).toFixed(5));
    if (sumWeights !== 1)
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: [ `${sumWeights} portfolio weights sum ig greater than 1` ]
      });

    return this.backtestService.test(body);
  }
}