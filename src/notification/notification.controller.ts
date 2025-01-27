import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly NotificationService: NotificationService) { }

  @Post('subscribe')
  async subscribe(@Body() { userId, assetName }: { userId: string; assetName: string }) {
    return this.NotificationService.subscribeToAsset(userId, assetName);
  }

  @Post('send')
  async sendNotification(@Body() { userId, message }: { userId: string; message: string }) {
    return this.NotificationService.sendNotification(userId, message);
  }

  @Get(':userId')
  async getNotifications(@Param('userId') userId: string) {
    return this.NotificationService.getUserNotifications(userId);
  }
}
