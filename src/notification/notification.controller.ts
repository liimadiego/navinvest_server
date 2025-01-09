import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { NotificationsService } from './notification.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Post('subscribe')
  async subscribe(@Body() { userId, assetName }: { userId: string; assetName: string }) {
    return this.notificationsService.subscribeToAsset(userId, assetName);
  }

  @Post('send')
  async sendNotification(@Body() { userId, message }: { userId: string; message: string }) {
    return this.notificationsService.sendNotification(userId, message);
  }

  @Get(':userId')
  async getNotifications(@Param('userId') userId: string) {
    return this.notificationsService.getUserNotifications(userId);
  }
}
