import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { TickerService } from './ticker.service';
import { LanguagesService } from '../utils/language.service';

@Controller('ticker')
export class TickerController {
  constructor(
    private readonly tickerService: TickerService,
    private readonly languageService: LanguagesService
  ) { }


  @Get('get-all-dividends')
  async getAllDividends(@Query('month') month: number, @Query('year') year: number) {
    let missingFields = [];
    if (!month) {
      missingFields.push('month');
    }
    if (!year) {
      missingFields.push('year');
    }

    if (missingFields.length > 0) {
      throw new BadRequestException(`${this.languageService.getPhrase('MISSING_REQUIRED_PARAMETERS')}: ${missingFields.join(', ')}`);
    }

    return this.tickerService.getAllDividends(month, year);
  }

  @Get("/:query")
  async getTickers(@Query('limit') limit: number = 0, @Param('query') query: string = '', @Query('type') type: string = '') {
    return this.tickerService.getTickers(limit, query, type);
  }

  @Get('get-tickers-by-tags')
  async getTickersByTags(@Query('tags') tags: string) {
    let missingFields = [];

    if (!tags) {
      missingFields.push('tags');
    }

    if (missingFields.length > 0) {
      throw new BadRequestException(`${this.languageService.getPhrase('MISSING_REQUIRED_PARAMETERS')}: ${missingFields.join(', ')}`);
    }

    const tagsArray = tags.split(',');

    return this.tickerService.getTickersByTags(tagsArray);
  }

  @Get('get-proftability-by-ticker/:ticker')
  async getProftabilityByTicker(@Param('ticker') ticker: string) {
    return await this.tickerService.getProftabilityByTicker(ticker.toUpperCase())
      .then((data) => {
        return data;
      })
      .catch((error) => {
        throw new BadRequestException(error.message);
      });
  }
}
