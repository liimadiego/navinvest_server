import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) { }

  @Get('/other_news/:uuid')
  getOtherNews(@Param('uuid') uuid: string) {
    return this.newsService.getOtherNews(uuid);
  }

  @Get('/latest_news')
  getLatestNews() {
    return this.newsService.getLatestNews();
  }

  @Get(':uuid')
  getNews(@Param('uuid') uuid: string) {
    return this.newsService.getNewsById(uuid);
  }

}
