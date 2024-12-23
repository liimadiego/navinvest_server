import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { BacktestRequestDto } from "./backtest.dto";
import yahooFinance from 'yahoo-finance2';

@Injectable()
export class BacktestService {
  // Fetch historical prices for a stock
  private async fetchHistoricalPrices (ticker: string, startDate: number, endDate: number) {
    try {
      // Yahoo Finance expects dates in YYYY-MM-DD format
      const start = new Date(startDate).toISOString().split('T')[0];
      const end = new Date(endDate).toISOString().split('T')[0];

      // Fetch historical data
      const { quotes: prices } = await yahooFinance.chart(`${ticker}.SA`, {
        period1: start,
        period2: end,
        interval: '1d',
      });

      if (!prices || prices.length < 2) {
        throw new Error(`Insufficient data for ticker: ${ticker}`);
      }

      return prices;

    } catch (error) {
      throw new HttpException(
        `Failed to fetch historical data for ticker: ${ticker}. ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  calculateDailyLogReturns (prices: any[], weight: number) {
    let returns: number[] = [];
    let sum: number = 0;
    for (let i = 1; i < prices.length; i++) {
      const dailyLogReturn =  Math.log(prices[i].adjclose / prices[i - 1].adjclose) * weight;
      returns.push(dailyLogReturn);
      sum += dailyLogReturn;
    }
    return { returns, sum };
  }

  async test (body: BacktestRequestDto) {
    const { startDate, endDate, portfolio } = body;

    // Get the historial daily returns of each item in the portfolio.
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
        'For some reason not all the portfolio items have the same returns.length',
        HttpStatus.BAD_REQUEST,
      );

    // Calculate the total portifolio result.
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

    // Avg. daily return of the portfolio.
    portfolioResult.avgDailyReturn = totalLogReturn / returnsLength;

    // Convert the 'dailyLogReturns' to 'dailyReturns'.
    portfolioResult.dailyReturns = dailyLogReturns.map(r => Math.exp(r) - 1);

    // Convert 'totalLogReturn' to 'totalReturn'
    portfolioResult.totalReturn = Math.exp(totalLogReturn) - 1;

    // Calculate the volatility of the portfolio.
    const variance = dailyLogReturns.reduce((sum, r) => sum + Math.pow(r - portfolioResult.avgDailyReturn, 2), 0) / returnsLength;
    portfolioResult.volatility = Math.sqrt(variance);

    // Returns the 'portfolioResult'. 
    return portfolioResult;
  }
}