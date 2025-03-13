import { Injectable, BadRequestException, HttpStatus } from "@nestjs/common";
import { BacktestRequestDto } from "./backtest.dto";
import yahooFinance from 'yahoo-finance2';

const util = require('node:util');

@Injectable()
export class BacktestService {
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
      const start = new Date(startDate).toISOString().split('T')[0];  // Inclusive start date
      const end = new Date(endDate).toISOString().split('T')[0];      // Exclusive end date
      
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
    let dailyLogReturnsMap: Map<number, number[]> = new Map();
    let sum :number[] = [ 0, 0 ];

    for (let a_i = 0; a_i < assetsPrices.length; a_i++) { // Loop assets.
      const prices = assetsPrices[a_i];
      const weight = weights[a_i];

      for (let i = 1; i < prices.length; i++) { // Loop asset daily prices
        // Check for day with no market data.
        if (
          prices[i].adjclose === null && 
          prices[i].close === null && 
          prices[i].low === null && 
          prices[i].open === null && 
          prices[i].volume === null && 
          prices[i].high === null
        ) {
          // No data for that day, copy the last 'adjclose' if exists or continue.
          if (prices[i-1].adjclose === null) continue;
          prices[i].adjclose = prices[i-1].adjclose; // As the price have not changed.

          // Do the same for 'close'.
          if (prices[i-1].close === null) continue;
          prices[i].close = prices[i-1].close; // As the price have not changed.
        }

        const dayTimestamp = prices[i].date.getTime(); // Math.round(prices[i].date.getTime() / 864e5) * 864e5; // new Date(prices[i].date.toISOString().split('T')[0]).getTime();
        const dailyLogReturn = Math.log(prices[i].adjclose / prices[i - 1].adjclose) * weight;
        const dailyLogReturnNoDiv = Math.log(prices[i].close / prices[i - 1].close) * weight;

        let returnsArray: number[] = dailyLogReturnsMap.get(dayTimestamp);
        if (returnsArray === undefined) {
          returnsArray = [ 0, 0 ];
          dailyLogReturnsMap.set(dayTimestamp, returnsArray);
        }

        returnsArray[0] += dailyLogReturn;
        returnsArray[1] += dailyLogReturnNoDiv;

        sum[0] += dailyLogReturn;
        sum[1] += dailyLogReturnNoDiv;
      }
    }

    const returns: [number, number[]][] = Array.from(dailyLogReturnsMap.entries()).sort((a, b) => a[0] - b[0]);
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
        message: [ 'INVALID_DATE_RANGE' ]
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
      const errorStr = error.toString();

      let errorCode = 'UNEXPECTED_BACKTEST_ERROR';
      if (errorStr.includes('Não foi possível encontrar o simbolo usado pelo yahoo para o ativo')) {
        errorCode = 'PORTFOLIO_ASSETS_NOT_IDENTIFIED';
      } else if (errorStr.includes('Não foi possível encontrar o simbolo usado pelo yahoo para o par')) {
        errorCode = 'BASE_CURRENCY_NOT_IDENTIFIED';
      } else if (errorStr.includes('yahooFinance.chart() options `period1` and `period2` cannot share the same value.')) {
        errorCode = 'START_END_DATES_ERROR';
      } else {
        console.log(`[E] Unknow Backtest ERROR (${errorStr}):' ${util.inspect(error, { colors: true, depth: Infinity })}\n `);
      }

      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: [ errorCode ]
      });
    }

    let portfolioResult = {
      computedDays: Math.max(...portfolioItensReturns.map(p => p.returns.length)),
      dailyReturns: undefined,
      monthlyReturns: undefined,
      totalReturn: undefined,
      avgDailyReturn: undefined,
      volatility: undefined,
      assetsDates: {}
    };

    // Equaliza os dados quando um ativo do portfólio não foi negociado enquanto os outros estavam em operação.
    let dailyLogReturnsMap: Map<number, number[]> = new Map();
    for (const { returns, sum, assetDate, ticker } of portfolioItensReturns) {
      portfolioResult.assetsDates[ticker] = assetDate;

      for (let i = 0; i < returns.length; i++) {
        const [ date, returnsArray ] = returns[i];

        let totalReturnsArray = dailyLogReturnsMap.get(date);
        if (totalReturnsArray === undefined) {
          totalReturnsArray = new Array(returnsArray.length).fill(0);
          dailyLogReturnsMap.set(date, totalReturnsArray);
        }

        totalReturnsArray[0] += returnsArray[0];
        totalReturnsArray[1] += returnsArray[1];
      }
    }
    let dailyLogReturns :[any, number[]][] = Array.from(dailyLogReturnsMap.entries()).sort((a, b) => a[0] - b[0]);

    // Converte retornos diários de 'Log' para 'Porcentagem'.
    let dailyReturns = [];
    let dailyLogAcumulado :number[] = [ 0, 0 ];
    let monthlyReturns = [];
    for (let i = 0; i < dailyLogReturns.length; i++) {
      const dlrDate = new Date(dailyLogReturns[i][0]);

      dailyLogAcumulado[0] += dailyLogReturns[i][1][0];
      dailyLogAcumulado[1] += dailyLogReturns[i][1][1];
      
      dailyReturns.push({
        date: dlrDate.toISOString().split('T')[0],
        comdiv :{ // Com dividendos
          atual: Math.exp(dailyLogReturns[i][1][0]) - 1,
          acumulado: Math.exp(dailyLogAcumulado[0]) - 1,
        },
        semdiv: { // Sem dividendos
          atual: Math.exp(dailyLogReturns[i][1][1]) - 1,
          acumulado: Math.exp(dailyLogAcumulado[1]) - 1,
        }
      });

      let lastMonthRet = monthlyReturns.at(-1);
      let lastMonthRetDate = new Date(lastMonthRet?.date);
      if (dlrDate.getUTCMonth() !== lastMonthRetDate.getUTCMonth()) {
        if (lastMonthRet) {
          lastMonthRet.date = new Date(lastMonthRet.date).toISOString().split('T')[0];
          lastMonthRet.comdiv.atual = Math.exp(lastMonthRet.comdiv.atual) - 1;
          lastMonthRet.comdiv.acumulado = Math.exp(lastMonthRet.comdiv.acumulado) - 1;
          lastMonthRet.semdiv.atual = Math.exp(lastMonthRet.semdiv.atual) - 1;
          lastMonthRet.semdiv.acumulado = Math.exp(lastMonthRet.semdiv.acumulado) - 1;
        }
        lastMonthRet = { 
          date: dailyLogReturns[i][0], 
          comdiv: { atual: 0, acumulado: lastMonthRet?.comdiv.acumulado || 0 }, 
          semdiv: { atual: 0, acumulado: lastMonthRet?.semdiv.acumulado || 0 } 
        };
        monthlyReturns.push(lastMonthRet);
      }
      lastMonthRet.comdiv.atual += dailyLogReturns[i][1][0];
      lastMonthRet.comdiv.acumulado = dailyLogAcumulado[0];
      lastMonthRet.semdiv.atual += dailyLogReturns[i][1][1];
      lastMonthRet.semdiv.acumulado = dailyLogAcumulado[1];
    }
    // Convert the last month return from 'log' to 'pctg' returns.
    const lastMonthRet = monthlyReturns.at(-1);
    lastMonthRet.date = new Date(lastMonthRet.date).toISOString().split('T')[0];
    lastMonthRet.comdiv.atual = Math.exp(lastMonthRet.comdiv.atual) - 1;
    lastMonthRet.comdiv.acumulado = Math.exp(lastMonthRet.comdiv.acumulado) - 1;
    lastMonthRet.semdiv.atual = Math.exp(lastMonthRet.semdiv.atual) - 1;
    lastMonthRet.semdiv.acumulado = Math.exp(lastMonthRet.semdiv.acumulado) - 1;

    portfolioResult.dailyReturns = dailyReturns;
    portfolioResult.monthlyReturns = monthlyReturns;

    portfolioResult.avgDailyReturn = {
      comdiv: dailyLogAcumulado[0] / portfolioResult.computedDays, 
      semdiv: dailyLogAcumulado[1] / portfolioResult.computedDays 
    };

    portfolioResult.volatility = {
      comdiv: Math.sqrt(dailyLogReturns.reduce((sum, dr) => sum + Math.pow(dr[1][0] - portfolioResult.avgDailyReturn.comdiv, 2), 0) / portfolioResult.computedDays),
      semdiv: Math.sqrt(dailyLogReturns.reduce((sum, dr) => sum + Math.pow(dr[1][1] - portfolioResult.avgDailyReturn.semdiv, 2), 0) / portfolioResult.computedDays)
    };

    // Converte retorno total de 'Log' para 'Porcentagem'.
    portfolioResult.totalReturn = {
      comdiv: dailyReturns.at(-1).comdiv.acumulado, // Math.exp(dailyLogAcumulado[0]) - 1,
      semdiv: dailyReturns.at(-1).semdiv.acumulado // Math.exp(dailyLogAcumulado[1]) - 1
    };

    return portfolioResult;
  }
}