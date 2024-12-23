import { Body, Controller, HttpException, HttpStatus, Post } from "@nestjs/common";
import { BacktestService } from "./backtest.service";
import { BacktestRequestDto } from "./backtest.dto";

@Controller('backtest')
export class BacktestController {
  constructor(private backtestService: BacktestService) { }

  @Post('test')
  test(@Body() body: BacktestRequestDto) {
    const sumWeights = body.portfolio.reduce((sum, item) => sum + item.weight, 0);
    if (sumWeights !== 1)
      throw new HttpException(
        `A soma dos pesos dos itens do portfólio não é 1`,
        HttpStatus.BAD_REQUEST,
      );

    return this.backtestService.test(body);
  }
}