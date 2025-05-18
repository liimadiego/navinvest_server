import { Injectable } from '@nestjs/common';
import { UserEntity } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenUsageEntity } from 'entities/token-usage.entity';

@Injectable()
export class UsersService {
    private readonly TOKEN_LIMIT = 1_000_000;

    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        @InjectRepository(TokenUsageEntity)
        private readonly tokenUsageRepository: Repository<TokenUsageEntity>,
    ) { }

    async getAllUsers(): Promise<UserEntity[]> {
        return this.userRepository.find({
            relations: ['plan'],
            order: {
                created_at: 'DESC'
            }
        });
    }

    async findOne(email: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({
            where: { email },
        });
    }

    async findByPhoneNumber(phone_number: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({
            where: { phone_number },
        });
    }

    async create(user: Partial<UserEntity>): Promise<any> {
        const newUser = this.userRepository.create(user);
        return this.userRepository.save(newUser);
    }

    async updatePassword(id: string, password_hash: string): Promise<any> {
        return this.userRepository.update(id, { password_hash });
    }

    async findById(id: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({
            where: { id },
            relations: ['plan']
        });
    }

    async findAll(): Promise<UserEntity[]> {
        return this.userRepository.find({
            order: {
                created_at: 'DESC'
            }
        });
    }

    async getAllUsersWithInvestmentPortfolio(): Promise<UserEntity[]> {
        return this.userRepository.find({
            relations: ['portfolios'],
            order: {
                created_at: 'DESC'
            }
        });
    }

    async userHasAccess(id: string, plansAllowed: string[]): Promise<boolean> {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['plan']
        });

        if (!user) {
            return false;
        }

        if (!user.plan) {
            return false;
        }

        if (plansAllowed.length > 0) {
            return plansAllowed.includes(user.plan.slug) && user.plan_expiration > new Date();
        }

        return user.plan !== null && user.plan_expiration > new Date();
    }

    async canUseTokens(user_id: string): Promise<boolean> {
        const tokenUsage = await this.tokenUsageRepository.findOne({ where: { user_id } }) || await this.tokenUsageRepository.save({ user_id, tokens_used: 0 });
        return tokenUsage.tokens_used <= this.TOKEN_LIMIT;
    }

    async addTokens(user_id: string, tokens: number): Promise<void> {
        let tokenUsage = await this.tokenUsageRepository.findOne({ where: { user_id } });
        if (!tokenUsage) {
            tokenUsage = this.tokenUsageRepository.create({ user_id, tokens_used: 0 });
        }
        tokenUsage.tokens_used += tokens;
        await this.tokenUsageRepository.save(tokenUsage);
    }

    async getTokenUsageByUserId(userId: string): Promise<any> {
        let tokenUsage = await this.tokenUsageRepository.findOne({
            where: { user_id: userId },
        });

        if (!tokenUsage) {
            tokenUsage = this.tokenUsageRepository.create({ user_id: userId, tokens_used: 0 });
            await this.tokenUsageRepository.save(tokenUsage);
        }

        delete tokenUsage.user_id;
        delete tokenUsage.id;

        //retorna a porcentagem em uso
        tokenUsage.tokens_used = tokenUsage.tokens_used / this.TOKEN_LIMIT;

        return tokenUsage;
    }
}
