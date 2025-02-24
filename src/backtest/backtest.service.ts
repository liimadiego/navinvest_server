import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { BacktestRequestDto } from "./backtest.dto";
import yahooFinance from 'yahoo-finance2';

@Injectable()
export class BacktestService {
  // Detecta se o ticker pertence ao Brasil e adiciona o sufixo ".SA" se necessário
  private formatTicker(ticker: string): string {
    return /^[A-Z]+\d+$/.test(ticker) ? `${ticker}.SA` : ticker;
  }

  private async fetchHistoricalPrices(ticker: string, startDate: number, endDate: number) {
    try {
      const start = new Date(startDate).toISOString().split('T')[0];
      const end = new Date(endDate).toISOString().split('T')[0];

      const { quotes: prices } = await yahooFinance.chart(this.formatTicker(ticker), {
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
    let returns: [number, number][] = [];
    let sum: number = 0;
    for (let i = 1; i < prices.length; i++) {
      const dailyLogReturn = Math.log(prices[i].adjclose / prices[i - 1].adjclose) * weight;
      returns.push([ new Date(prices[i].date.toISOString().split('T')[0]).getTime(), dailyLogReturn ]);
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

    const start = portfolioItensReturns[0].returns[0][0];
    if (portfolioItensReturns.some(p => p.returns[0][0] !== start))
      throw new HttpException(
        'Não foi possível encontrar cotações para todas as ações no período informado. Por favor, escolha uma data de início (startDate) a partir de quando todas as ações possuem dados históricos.',
        HttpStatus.BAD_REQUEST,
      );

    let portfolioResult = {
      computedDays: Math.max(...portfolioItensReturns.map(p => p.returns.length)),
      dailyReturns: undefined,
      totalReturn: undefined,
      avgDailyReturn: undefined,
      volatility: undefined
    };

    // Equaliza os dados quando um ativo do portfólio não foi negociado enquanto os outros estavam em operação.
    let dailyLogReturnsMap: Map<number, number> = new Map();
    let totalLogReturn = 0;
    for (const { returns, sum } of portfolioItensReturns) {
      totalLogReturn += sum;
      for (let i = 0; i < returns.length; i++) {
        const [ date, dailyLogReturn ] = returns[i];
        dailyLogReturnsMap.set(date, (dailyLogReturnsMap.get(date) || 0) + dailyLogReturn);
      }
    }
    let dailyLogReturns: [number, number][] = Array.from(dailyLogReturnsMap.entries()).sort((a, b) => a[0] - b[0]);

    portfolioResult.avgDailyReturn = totalLogReturn / portfolioResult.computedDays;

    const variance = dailyLogReturns.reduce((sum, dr) => sum + Math.pow(dr[1] - portfolioResult.avgDailyReturn, 2), 0) / portfolioResult.computedDays;
    portfolioResult.volatility = Math.sqrt(variance);

    // Converte retornos diários de 'Log' para 'Porcentagem'.
    portfolioResult.dailyReturns = dailyLogReturns.map(([ d, r ]) => [ d, Math.exp(r) - 1 ]);

    // Converte retorno total de 'Log' para 'Porcentagem'.
    portfolioResult.totalReturn = Math.exp(totalLogReturn) - 1;

    return portfolioResult;
  }
}