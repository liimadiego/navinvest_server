import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { BacktestRequestDto } from "./backtest.dto";
import yahooFinance from 'yahoo-finance2';

@Injectable()
export class BacktestService {
  private async fetchHistoricalPrices(ticker: string, startDate: number, endDate: number) {
    try {
      const start = new Date(startDate).toISOString().split('T')[0];
      const end = new Date(endDate).toISOString().split('T')[0];

      const { quotes: prices } = await yahooFinance.chart(`${ticker}.SA`, {
        period1: start,
        period2: end,
        interval: '1d',
      });

      if (!prices || prices.length < 2) {
        throw new Error(`Dados insuficientes para o ticker: ${ticker}`);
      }

      return prices;

    } catch (error) {
      throw new HttpException(
        `Falha ao buscar dados históricos para o ticker: ${ticker}. ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  calculateDailyLogReturns(prices: any[], weight: number) {
    let returns: number[] = [];
    let sum: number = 0;
    for (let i = 1; i < prices.length; i++) {
      const dailyLogReturn = Math.log(prices[i].adjclose / prices[i - 1].adjclose) * weight;
      returns.push(dailyLogReturn);
      sum += dailyLogReturn;
    }
    return { returns, sum };
  }

  async test(body: BacktestRequestDto) {
    const { startDate, endDate, portfolio } = body;

    let promises = [];
    for (const { ticker, weight } of portfolio)
      promises.push(
        this.fetchHistoricalPrices(ticker, startDate, endDate)
          .then(prices => this.calculateDailyLogReturns(prices, weight))
      );
    const portfolioItensReturns = await Promise.all(promises);
    const returnsLength = portfolioItensReturns[0].returns.length;

    if (portfolioItensReturns.some(item => item.returns.length !== returnsLength))
      throw new HttpException(
        'Por algum motivo, nem todos os itens do portfólio têm o mesmo tamanho de retornos.',
        HttpStatus.BAD_REQUEST,
      );

    let portfolioResult = {
      computedDays: returnsLength,
      dailyReturns: undefined,
      totalReturn: undefined,
      avgDailyReturn: undefined,
      volatility: undefined
    };

    let dailyLogReturns = new Array(returnsLength).fill(0);
    let totalLogReturn = 0;
    for (const { returns, sum } of portfolioItensReturns) {
      totalLogReturn += sum;
      for (let i = 0; i < returnsLength; i++)
        dailyLogReturns[i] += returns[i];
    }

    portfolioResult.avgDailyReturn = totalLogReturn / returnsLength;

    portfolioResult.dailyReturns = dailyLogReturns.map(r => Math.exp(r) - 1);

    portfolioResult.totalReturn = Math.exp(totalLogReturn) - 1;

    const variance = dailyLogReturns.reduce((sum, r) => sum + Math.pow(r - portfolioResult.avgDailyReturn, 2), 0) / returnsLength;
    portfolioResult.volatility = Math.sqrt(variance);

    return portfolioResult;
  }
}