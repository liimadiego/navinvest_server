import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MonitoredAsset } from '../entities/monitored-asset.entity';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(MonitoredAsset)
        private MonitoredAssetRepository: Repository<MonitoredAsset>,
        @InjectRepository(Notification)
        private notificationRepository: Repository<Notification>,
    ) { }

    async subscribeToAsset(userId: string, assetName: string) {
        const subscription = this.MonitoredAssetRepository.create({ user: { id: userId }, assetName });
        return this.MonitoredAssetRepository.save(subscription);
    }

    async sendNotification(userId: string, message: string) {
        const notification = this.notificationRepository.create({ user: { id: userId }, message });
        return this.notificationRepository.save(notification);
    }

    async getUserNotifications(userId: string) {
        return this.notificationRepository.find({ where: { user: { id: userId } }, order: { createdAt: 'DESC' } });
    }
}
