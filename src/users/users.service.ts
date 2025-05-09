import { Injectable } from '@nestjs/common';
import { UserEntity } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>
    ) { }

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
}
