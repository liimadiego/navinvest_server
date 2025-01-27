import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MonitoredAssetEntity } from '../entities/monitored-asset.entity';
import { NotificationEntity } from '../entities/notification.entity';

@Injectable()
export class NotificationService {
    constructor(
        @InjectRepository(MonitoredAssetEntity)
        private MonitoredAssetRepository: Repository<MonitoredAssetEntity>,
        @InjectRepository(NotificationEntity)
        private notificationRepository: Repository<NotificationEntity>,
    ) { }

    async subscribeToAsset(userId: string, assetName: string) {
        try {
            const subscription = this.MonitoredAssetRepository.create({ user: { id: userId }, assetName });
            return this.MonitoredAssetRepository.save(subscription);
        } catch (error) {

        }
    }

    async createNotification(userId: string, message: string) {
        const notification = this.notificationRepository.create({ user: { id: userId }, message });
        return this.notificationRepository.save(notification);
    }

    async getUserNotifications(userId: string) {
        return this.notificationRepository.find({ where: { user: { id: userId } }, order: { createdAt: 'DESC' } });
    }
}
