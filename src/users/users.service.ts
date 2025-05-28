import { Injectable } from '@nestjs/common';
import { UserEntity } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenUsageEntity } from 'entities/token-usage.entity';
import { PlanEntity } from 'entities/plan.entity';

@Injectable()
export class UsersService {
    private readonly TOKEN_LIMIT = 1_000_000;

    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        @InjectRepository(TokenUsageEntity)
        private readonly tokenUsageRepository: Repository<TokenUsageEntity>,
        @InjectRepository(PlanEntity)
        private readonly planRepository: Repository<PlanEntity>,
    ) { }

    async getAllUsers(): Promise<UserEntity[]> {
        return this.userRepository.find({
            relations: ['plan'],
            order: {
                created_at: 'DESC'
            }
        });
    }

    async makeUserPremium(id: string, plan_slug: string, plan_cycle: string, trial7days: boolean = false): Promise<UserEntity | null> {
        if (plan_cycle !== 'monthly' && plan_cycle !== 'yearly') {
            throw new Error('Invalid plan cycle. Must be "monthly" or "yearly".');
        }

        let user = await this.userRepository.findOne({
            where: { id }
        });

        if (!user) {
            return null;
        }

        const plan = await this.planRepository.findOne({
            where: { slug: plan_slug }
        });

        if (!plan) {
            return null;
        }

        const planId = plan.id;
        const planExpiration = new Date();
        const trial = trial7days ? 7 : 0;

        if (trial7days) {
            if (plan_cycle === 'monthly') {
                planExpiration.setDate(planExpiration.getDate() + trial);
            } else if (plan_cycle === 'yearly') {
                planExpiration.setDate(planExpiration.getDate() + trial);
            }
        } else {
            if (plan_cycle === 'monthly') {
                planExpiration.setMonth(planExpiration.getMonth() + 1);
                planExpiration.setDate(planExpiration.getDate() + 2);
            } else if (plan_cycle === 'yearly') {
                planExpiration.setFullYear(planExpiration.getFullYear() + 1);
                planExpiration.setDate(planExpiration.getDate() + 2);
            }
        }

        user.plan_id = planId;
        user.plan_expiration = planExpiration;

        return this.userRepository.save(user);
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
        let tokenUsage = await this.tokenUsageRepository.findOne({ where: { user_id } });
        if (!tokenUsage) {
            tokenUsage = this.tokenUsageRepository.create({ user_id, tokens_used: 0 });
            await this.tokenUsageRepository.save(tokenUsage);
        }

        return tokenUsage.tokens_used <= this.TOKEN_LIMIT;
    }

    async savePaymentSubscriptionId(userId: string, subscriptionId: string): Promise<void> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }

        if (!subscriptionId) {
            throw new Error('Payment ID and Subscription ID are required');
        }

        user.checkoutSubscriptionId = subscriptionId;

        await this.userRepository.save(user);
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