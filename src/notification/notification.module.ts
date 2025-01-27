import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { MonitoredAssetEntity } from '../entities/monitored-asset.entity';
import { NotificationEntity } from 'src/entities/notification.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MonitoredAssetEntity,
      NotificationEntity
    ])
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule { }
