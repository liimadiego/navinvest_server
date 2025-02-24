import { Body, Controller, Get, HttpException, HttpStatus, Post, Query } from '@nestjs/common';
import { TagService } from './tag.service';

@Controller('tag')
export class TagController {
  constructor(private readonly tagService: TagService) { }

  @Post('add-tag-to-tickers')
  async addTagToTickers(@Body() body: { ticker_names: string[]; tag_names: string[] }) {
    const { ticker_names, tag_names } = body;

    let missingFields = [];

    if (!ticker_names) {
      missingFields.push('ticker_names');
    }

    if (!tag_names) {
      missingFields.push('tag_names');
    }

    if (missingFields.length) {
      throw new HttpException(`Missing fields: ${missingFields.join(', ')}`, HttpStatus.BAD_REQUEST);
    }

    return this.tagService.addTagsToTickers(ticker_names, tag_names);
  }

  @Get('get-tags-by-ticker')
  async getTagsByTicker(@Query() query: { ticker_name: string }) {
    const { ticker_name } = query;

    if (!ticker_name) {
      throw new HttpException(`Missing field: ticker_name`, HttpStatus.BAD_REQUEST);
    }

    return this.tagService.getTagsByTickerName(ticker_name);
  }

}
