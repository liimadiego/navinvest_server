import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { TickerService } from './ticker.service';
import { LanguagesService } from ''@/utils/language';;

@Controller('ticker')
export class TickerController {
  constructor(
    private readonly tickerService: TickerService,
    private readonly languageService: LanguagesService
  ) { }

  @Get()
  async getTickers() {
    return this.tickerService.getTickers();
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
}
