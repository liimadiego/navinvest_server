import { Controller, Post, Body, Get, Param, BadRequestException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { LanguagesService } from 'src/utils/language';

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly NotificationService: NotificationService,
    private readonly LanguagesService: LanguagesService
  ) { }

  @Post('subscribe')
  async subscribe(@Body() { userId, assetName }: { userId: string; assetName: string }) {
    try {
      let missingParams = [];

      if (!userId) {
        missingParams.push('userId');
      }

      if (!assetName) {
        missingParams.push('assetName');
      }

      if (missingParams.length > 0) {
        throw new BadRequestException(`${this.LanguagesService.getPhrase("MISSING_REQUIRED_PARAMETERS")}: ${missingParams.join(', ')}`);
      }

      return this.NotificationService.subscribeToAsset(userId, assetName);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new BadRequestException(this.LanguagesService.getPhrase("SUBSCRIBE_ASSET_ERROR"));
      }
    }
  }

  @Post('create')
  async createNotification(@Body() { userId, message }: { userId: string; message: string }) {
    try {
      let missingParams = [];

      if (!userId) {
        missingParams.push('userId');
      }

      if (!message) {
        missingParams.push('message');
      }

      if (missingParams.length > 0) {
        throw new BadRequestException(`${this.LanguagesService.getPhrase("MISSING_REQUIRED_PARAMETERS")}: ${missingParams.join(', ')}`);
      }

      return this.NotificationService.createNotification(userId, message);

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new BadRequestException(this.LanguagesService.getPhrase("CREATE_NOTIFICATION_ERROR"));
      }
    }

  }

  @Get(':userId')
  async getNotifications(@Param('userId') userId: string) {
    try {
      let missingParams = [];

      if (!userId) {
        missingParams.push('userId');
      }

      if (missingParams.length > 0) {
        throw new BadRequestException(`${this.LanguagesService.getPhrase("MISSING_REQUIRED_PARAMETERS")}: ${missingParams.join(', ')}`);
      }

      return this.NotificationService.getUserNotifications(userId);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new BadRequestException(this.LanguagesService.getPhrase("GET_NOTIFICATIONS_ERROR"));
      }
    }
  }
}
