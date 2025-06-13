import { Body, Controller, BadRequestException, HttpStatus, Post, Query, Get } from "@nestjs/common";
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
        message: [`${sumWeights} portfolio weights sum is greater than 1`]
      });

    return this.backtestService.test(body);
  }

  @Get('historicalPrices')
  async getHistoricalPrices(@Query('ticker') ticker: string, @Query('startDate') startDate: number, @Query('endDate') endDate: number, @Query('pricesToReturn') pricesToReturn: string | string[]) {
    try {
      const { symbol } = await this.backtestService.getYahooSymbol(ticker);
      const r = await this.backtestService.fetchHistoricalPrices(symbol, startDate * 1, endDate * 1, "object", pricesToReturn);

      return r;

    } catch (error) {

      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: [
          `Error fetching historical prices for ticker '${ticker}': ${error.message || error}`
        ]
      });
    }
  }
}