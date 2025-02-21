import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InvestorProfileEntity } from 'src/entities/investor-profile.entity';
import { UserEntity } from 'src/entities/user.entity';
import { TagEntity } from 'src/entities/tag.entity';
import { Repository } from 'typeorm';
import { investorProfileAnswers, InvestorProfile } from './investor-profile-interface';
import OpenAI from 'openai';
import { PromptsService } from '../utils/prompts';

@Injectable()
export class InvestorProfileService {
    private openai: OpenAI;
    private prompts = new PromptsService().getPrompts();

    constructor(
        @InjectRepository(InvestorProfileEntity)
        private readonly investorProfileRepository: Repository<InvestorProfileEntity>,
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        @InjectRepository(TagEntity)
        private readonly tagRepository: Repository<TagEntity>
    ) {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

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

            let result = await this.investorProfileRepository.save(existingProfile);

            return result;
        }

        let result = await this.investorProfileRepository.save({ ...investorProfile, user, profile });

        delete result.user;

        return result;

    }

    async getInvestmentPlan(user_id: string): Promise<any> {
        try {
            const tags = await this.tagRepository.find();
            const tags_string = tags.map(tag => tag.name).join(",\n ");

            const investorProfile = await this.investorProfileRepository.createQueryBuilder('investor_profile')
                .where('investor_profile.user_id = :user_id', { user_id })
                .getOne();

            if (!investorProfile) {
                throw new Error('Perfil de investidor não encontrado.');
            }

            const prompt_investment_plan = this.prompts["get_investment_plan_context"];

            const user_answers_and_profile = `As respostas deste usuário para o questionário foram: 1 - ${investorProfile.experience} | 2 - ${investorProfile.risk_tolerance} | 3 - ${investorProfile.investment_horizon} | 4 - ${investorProfile.market_reaction} | 5 - ${investorProfile.investment_goal} | Perfil de investidor: ${investorProfile.profile}`;

            const tags_prompt = `As tags possíveis são as seguintes (lembre-se de devolver exatamente igual, case sensitive. Se você falhar, posso ter um possível churn): ${tags_string}`;

            // return { prompt_investment_plan, user_answers_and_profile, tags_prompt };

            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: this.prompts["get_investment_plan_context"] },
                    { role: 'system', content: user_answers_and_profile },
                    { role: 'system', content: tags_prompt }

                ],
                response_format: { "type": "json_object" }
            });

            return JSON.parse(response.choices[0].message?.content || '{}');
        } catch (error) {
            throw new Error(error.message);
        }
    }


}
