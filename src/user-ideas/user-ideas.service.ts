import { Injectable, HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserIdeaEntity } from 'entities/user-idea.entity';

@Injectable()
export class UserIdeasService {
    constructor(
        @InjectRepository(UserIdeaEntity)
        private readonly userIdeasRepository: Repository<UserIdeaEntity>,
    ) {}

    async saveIdea(userId: string, title: string, description: string): Promise<UserIdeaEntity> {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const ideasTodayCount = await this.userIdeasRepository.createQueryBuilder('idea')
            .where('idea.user_id = :userId', { userId })
            .andWhere('idea.created_at BETWEEN :startOfDay AND :endOfDay', { startOfDay, endOfDay })
            .getCount();

        if (ideasTodayCount >= 2) {
            throw new HttpException('Limite diário de ideias excedido.', 429);
        }

        const idea = this.userIdeasRepository.create({ userId, title, description });
        return this.userIdeasRepository.save(idea);
    }
}
