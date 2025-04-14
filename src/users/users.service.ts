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
