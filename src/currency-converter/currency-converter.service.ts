import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { currencyConverterRequestDto } from "./currency-converter.dto";
const { getRate } = require('gsk-currency-converter');

@Injectable({})
export class CurrencyConverterService {
  cache: Record<string, any> = {};

  async convert ({ from, to } : currencyConverterRequestDto) {
    const _nowms = Date.now();

    const cacheKey = `${from}-${to}`;
    if (!(_nowms - this.cache[cacheKey]?.timestamp <= 60e3*15)) {
      // Get new rate from 'getRate()'
      const r = await getRate(from, to);
      if (!r.success)
        // Exchange rate for the requested currency pair is not available. (Vou usar isso na hora de traduzir os comentários)
        throw new HttpException(
          r.error,
          HttpStatus.BAD_REQUEST,
        );

      r.fromCache = false;
      r.timestamp = _nowms;
      this.cache[cacheKey] = r;
    } else {
      this.cache[cacheKey].fromCache = true;
    }

    return this.cache[cacheKey];
  }
};