import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InvestorProfileEntity } from 'src/entities/investor-profile.entity';
import { UserEntity } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { investorProfileAnswers, InvestorProfile } from './investor-profile-interface';

@Injectable()
export class InvestorProfileService {
    constructor(
        @InjectRepository(InvestorProfileEntity)
        private readonly investorProfileRepository: Repository<InvestorProfileEntity>,
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
    ) { }

    determineInvestorProfile(answers: investorProfileAnswers): InvestorProfile {
        let score = 0;

        const points = { A: 1, B: 2, C: 3 };

        score += points[answers.experience];
        score += points[answers.risk_tolerance];
        score += points[answers.investment_horizon];
        score += points[answers.market_reaction];
        score += points[answers.investment_goal];

        if (score <= 7) {
            return 'Conservador';
        } else if (score <= 12) {
            return 'Moderado';
        } else {
            return 'Agressivo';
        }
    }

    async saveInvestorProfile(investorProfile: investorProfileAnswers, user_id: string): Promise<InvestorProfileEntity> {
        const user = await this.userRepository.createQueryBuilder('user')
            .where('user.id = :user_id', { user_id })
            .getOne();

        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        const profile = this.determineInvestorProfile(investorProfile);

        const existingProfile = await this.investorProfileRepository.createQueryBuilder('investor_profile')
            .where('investor_profile.user_id = :user_id', { user_id })
            .getOne();

        if (existingProfile) {
            existingProfile.experience = investorProfile.experience;
            existingProfile.risk_tolerance = investorProfile.risk_tolerance;
            existingProfile.investment_horizon = investorProfile.investment_horizon;
            existingProfile.market_reaction = investorProfile.market_reaction;
            existingProfile.investment_goal = investorProfile.investment_goal;
            existingProfile.profile = profile;

            return this.investorProfileRepository.save(existingProfile);
        }

        return this.investorProfileRepository.save({ ...investorProfile, user, profile });

    }
}
