import { BadRequestException, HttpStatus, Injectable } from "@nestjs/common";
import { currencyConverterRequestDto } from "./currency-converter.dto";

const { getRate } = require('gsk-currency-converter');
const util = require('node:util');

@Injectable({})
export class CurrencyConverterService {
  cache: Record<string, any> = {};

  async convert ({ from, to } : currencyConverterRequestDto) {
    try {
      const _nowms = Date.now();
  
      const cacheKey = `${from}-${to}`;
      if (!(_nowms - this.cache[cacheKey]?.timestamp <= 60e3*15)) {
        // Get new rate from 'getRate()'
        const r = await getRate(from, to);
        if (!r.success) throw r.error;
  
        r.fromCache = false;
        r.timestamp = _nowms;
        this.cache[cacheKey] = r;
      } else {
        this.cache[cacheKey].fromCache = true;
      }
  
      return this.cache[cacheKey];

    } catch (error) {
      const errorStr = error.toString();

      let errorCode = 'CURRENCY_RATE_FETCH_FAILED';
      if (!(errorStr.startsWith('Exchange rate for ') && errorStr.endsWith(' not found.'))) {
        console.log(`[E] Unknow Backtest ERROR (${error.toString()}):' ${util.inspect(error, { colors: true, depth: Infinity })}\n `);
      }

      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: [ errorCode ]
      });
    }
  }
};