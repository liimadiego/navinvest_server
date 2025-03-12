import { Injectable, BadRequestException, HttpStatus } from "@nestjs/common";
import { BacktestRequestDto } from "./backtest.dto";
import { LanguagesService } from '../Utils/language';
import yahooFinance from 'yahoo-finance2';

const util = require('node:util');

@Injectable()
export class BacktestService {
  private languagesService: LanguagesService = new LanguagesService();
  
  historicalRatesCache: Record<string, any> = {};

  // Pega um ticker como 'TAEE11' e busca na base do yahoo o simbolo usado pelo yahoo, como 'TAEE11.SA' por exemplo.
  private async getYahooSymbol (ticker: string) {
    const tickerType = ticker.split(':')[1];
    ticker = ticker.split(':')[0];

    try {
      const { quotes } = await yahooFinance.search(ticker, { quotesCount: 6, newsCount: 0 });
      for (const q of quotes) {
        if ('symbol' in q && (q.symbol === ticker || q.symbol.startsWith(`${ticker}.`) || (tickerType === 'CURRENCY' && q.quoteType === 'CURRENCY' && q.longname.replace('/', '') === ticker && q.shortname.replace('/', '') === ticker)))
          return q.symbol;
      }

      throw `Não foi possível encontrar o simbolo usado pelo yahoo para o ativo "${ticker}", search quotes: ${util.inspect(quotes, { colors: true, depth: Infinity })}`;

    } catch (error) {
      console.error(`[E] getYahooSymbol (ticker= ${ticker}):`, error, '\n ');
      throw error;
    } 
  }

  private async fetchHistoricalPrices (symbol: string, startDate: number, endDate: number) {
    try {
      const start = new Date(startDate).toISOString().split('T')[0];
      const end = new Date(endDate).toISOString().split('T')[0];
      
      const { meta: { currency: baseCurrency }, quotes: prices } = await yahooFinance.chart(symbol, {
        period1: start,
        period2: end,
        interval: '1d',
      });

      if (!prices || prices.length < 2)
        throw `Dados insuficientes para o symbol: ${symbol}`;

      // Convert 'price.date' to start of the day instead of start of exchange trading period.
      for (const p of prices) p.date.setUTCHours(0, 0, 0, 0);

      return { baseCurrency, prices };

    } catch (error) {
      console.error(`[E] fetchHistoricalPrices (symbol= ${symbol}, startDate= ${startDate}, endDate = ${endDate}):`, error, '\n ');
      throw error;
    }
  }

  private async fetchHistoricalRates (symbol: string, startDate: number, endDate: number) {
    try {
      const start = new Date(startDate).toISOString().split('T')[0];
      const end = new Date(endDate).toISOString().split('T')[0];

      const cacheKey = `${start}${end}${symbol}`;
      let fromCache = true;

      if (!this.historicalRatesCache[cacheKey]) {
        // Search 'yahooSymbol' for 'pair.symbol'.
        const { quotes } = await yahooFinance.search(symbol, { quotesCount: 6, newsCount: 0 });
        const quote = quotes.find(q => 'quoteType' in q && q.quoteType === 'CURRENCY' && q.shortname === symbol && q.longname === symbol);
        if (quote == undefined || (!('symbol' in quote)))
          throw `Não foi possível encontrar o simbolo usado pelo yahoo para o par "${symbol}".`;
        const yahooSymbol = quote.symbol;
  
        // Get historical rates for 'yahooSymbol'.
        const { quotes: prices } = await yahooFinance.chart(yahooSymbol, {
          period1: start,
          period2: end,
          interval: '1d',
        });
  
        if (!prices || prices.length < 2)
          throw `Dados insuficientes para o par: ${symbol}`;

        this.historicalRatesCache[cacheKey] = prices;
        fromCache = false;
      }

      const prices :{ adjclose?: number; date: Date; high: number; low: number; open: number; close: number; volume: number; }[] = structuredClone(this.historicalRatesCache[cacheKey]);

      // Convert 'price.date' to start of the the closest day instead. 
      // (e.g.: Sometimes candle 'date' is something like '2024-09-22T23:00:00.000Z', when it happens convert it to '2024-09-23T00:00:00Z')
      for (const p of prices) p.date = new Date(Math.round(p.date.getTime() / 864e5) * 864e5);

      return { prices, fromCache };
      
    } catch (error) {
      console.error(`[E] fetchHistoricalRates (symbol= ${symbol}, startDate= ${startDate}, endDate = ${endDate}):`, error, '\n ');
      throw error;
    }
  }

  calculateDailyLogReturns(assetsPrices: { adjclose?: number; date: Date; high: number; low: number; open: number; close: number; volume: number; }[][], weights: number[]) {
    const maxPricesLength = Math.max(...assetsPrices.map(prices => prices.length));
    let dailyLogReturnsMap: Map<number, number> = new Map();
    let sum: number = 0;

    for (let a_i = 0; a_i < assetsPrices.length; a_i++) { // Loop assets.
      const prices = assetsPrices[a_i];
      const weight = weights[a_i];

      for (let i = 1; i < prices.length; i++) { // Loop asset daily prices
        const dayTimestamp = prices[i].date.getTime(); // Math.round(prices[i].date.getTime() / 864e5) * 864e5; // new Date(prices[i].date.toISOString().split('T')[0]).getTime();
        const dailyLogReturn = Math.log(prices[i].adjclose / prices[i - 1].adjclose) * weight;
        dailyLogReturnsMap.set(dayTimestamp, (dailyLogReturnsMap.get(dayTimestamp) || 0) + dailyLogReturn);
        sum += dailyLogReturn;
      }
    }

    const returns: [number, number][] = Array.from(dailyLogReturnsMap.entries()).sort((a, b) => a[0] - b[0]);
    return { returns, sum };

    // for (let i = 1; i < prices.length; i++) {
    //   const dailyLogReturn = Math.log(prices[i].adjclose / prices[i - 1].adjclose) * weight;
    //   returns.push([ new Date(prices[i].date.toISOString().split('T')[0]).getTime(), dailyLogReturn ]);
    //   sum += dailyLogReturn;
    // }
    // return { returns, sum };
  }

  async test(body: BacktestRequestDto) {
    const { startDate, endDate, baseCurrency: portfolioBaseCurrency, portfolio } = body;

    if (!(endDate >= startDate))
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: [ this.languagesService.getPhrase('INVALID_DATE_RANGE') ]
      });

    let portfolioItensReturns = [];
    try {
      let promises = [];
      for (const { ticker, weight } of portfolio) {
        promises.push(
          this.getYahooSymbol(ticker)
          .then(yahooSymbol => this.fetchHistoricalPrices(yahooSymbol, startDate, endDate))
          .then(async ({ prices: assetPrices, baseCurrency: assetBaseCurrency }) => {

            const assetDate = {
              start: assetPrices.at(0).date.getTime(),
              end: assetPrices.at(-1).date.getTime()
            };
            
            if (assetBaseCurrency === portfolioBaseCurrency)
              return { ...this.calculateDailyLogReturns([ assetPrices ], [ weight ]), assetDate, ticker };
            
            // Need base currency conversion.

            const currencySymbol = `${assetBaseCurrency}/${portfolioBaseCurrency}`;
            const { prices: fxPrices, fromCache } = await this.fetchHistoricalRates(currencySymbol, startDate, endDate);

            const fxPricesFiltered = fxPrices.slice(
              fxPrices.findIndex(p => p.date.getTime() >= assetDate.start), 
              fxPrices.findLastIndex(p => p.date.getTime() <= assetDate.end) + 1
            );

            return { ...this.calculateDailyLogReturns([ assetPrices, fxPricesFiltered ], [ weight, weight ]), assetDate, ticker };
          })
        );
        portfolioItensReturns = await Promise.all(promises);
      }
    } catch (error) {
      let errorCode = 'UNEXPECTED_BACKTEST_ERROR';
      if (error.toString().includes('Não foi possível encontrar o simbolo usado pelo yahoo para o ativo')) {
        errorCode = 'PORTFOLIO_ASSETS_NOT_IDENTIFIED';
      } else if (error.toString().includes('Não foi possível encontrar o simbolo usado pelo yahoo para o par')) {
        errorCode = 'BASE_CURRENCY_NOT_IDENTIFIED';
      } else if (error.toString().includes('yahooFinance.chart() options `period1` and `period2` cannot share the same value.')) {
        errorCode = 'START_END_DATES_ERROR';
      } else {
        console.log(`[E] Unknow Backtest ERROR (${error.toString()}):' ${util.inspect(error, { colors: true, depth: Infinity })}\n `);
      }

      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: [ this.languagesService.getPhrase(errorCode) ]
      });
    }

    let portfolioResult = {
      computedDays: Math.max(...portfolioItensReturns.map(p => p.returns.length)),
      dailyReturns: undefined,
      totalReturn: undefined,
      avgDailyReturn: undefined,
      volatility: undefined,
      assetsDates: {}
    };

    // Equaliza os dados quando um ativo do portfólio não foi negociado enquanto os outros estavam em operação.
    let dailyLogReturnsMap: Map<number, number> = new Map();
    let totalLogReturn = 0;
    for (const { returns, sum, assetDate, ticker } of portfolioItensReturns) {
      portfolioResult.assetsDates[ticker] = assetDate;

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