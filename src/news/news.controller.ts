import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
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

  @Get('/get-all-news')
  getAllNews(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    if (page < 1) {
      page = 1;
    }
    if (limit < 1 || limit > 100) {
      limit = 10;
    }

    return this.newsService.getAllNews(page, limit);
  }

  @Get(':uuid')
  getNews(@Param('uuid') uuid: string) {
    return this.newsService.getNewsById(uuid);
  }

}
