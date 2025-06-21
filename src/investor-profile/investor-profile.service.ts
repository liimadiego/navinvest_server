import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InvestorProfileEntity } from '../entities/investor-profile.entity';
import { UserEntity } from '../entities/user.entity';
import { TagEntity } from '../entities/tag.entity';
import { Repository } from 'typeorm';
import { investorProfileAnswers, InvestorProfile } from './investor-profile-interface';
import OpenAI from 'openai';
import { PromptsService } from '../utils/prompts.service';
import { UsersService } from 'users/users.service';

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
        private readonly tagRepository: Repository<TagEntity>,
        private readonly usersService: UsersService,
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

    async getInvestmentPlan(userId: string): Promise<any> {
        let canUseTokens = await this.usersService.canUseTokens(userId);

        if (!canUseTokens) {
            throw new HttpException('Limite de tokens excedido.', 429);
        }

        try {
            const tags = await this.tagRepository.find();
            const tags_string = tags.map(tag => tag.name).join(",\n ");

            const investorProfile = await this.investorProfileRepository.createQueryBuilder('investor_profile')
                .where('investor_profile.user_id = :user_id', { user_id: userId })
                .getOne();

            if (!investorProfile) {
                throw new Error('Perfil de investidor não encontrado.');
            }

            const user_answers_and_profile = `As respostas deste usuário para o questionário foram: 1 - ${investorProfile.experience} | 2 - ${investorProfile.risk_tolerance} | 3 - ${investorProfile.investment_horizon} | 4 - ${investorProfile.market_reaction} | 5 - ${investorProfile.investment_goal} | Perfil de investidor: ${investorProfile.profile}`;

            const tags_prompt = `As tags possíveis são as seguintes (lembre-se de devolver exatamente igual, case sensitive. Se você falhar, posso ter um possível churn): ${tags_string}`;

            const response = await this.openai.chat.completions.create({
                model: process.env.OPEN_AI_MODEL,
                messages: [
                    { role: 'system', content: this.prompts["get_investment_plan_context"] },
                    { role: 'system', content: user_answers_and_profile },
                    { role: 'system', content: tags_prompt }

                ],
                response_format: { "type": "json_object" }
            });

            await this.usersService.addTokens(userId, response.usage.total_tokens ? response.usage.total_tokens : 1500);
            return JSON.parse(response.choices[0].message?.content || '{}');
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getInvestorProfile(userId: string): Promise<any> {
        // PRECISO MONTAR ISSO AQUI => [
        //     { id: "experience", question: "Qual o seu objetivo de investimento?", answer: "Crescimento a longo prazo" },
        //     { id: "risk_tolerance", question: "Por quanto tempo você pretende manter seus investimentos?", answer: "5-10 anos" },
        // ];

        const questionsData = {
            experience: {
                question: "Qual a sua experiência com investimentos?",
                options: [
                    "Nenhuma, estou começando agora.",
                    "Tenho alguma experiência, já investi antes.",
                    "Sou experiente, acompanho o mercado e faço investimentos regularmente."
                ]
            },
            risk_tolerance: {
                question: "Qual sua tolerância ao risco em relação a investimentos?",
                options: [
                    "Prefiro segurança total, mesmo que o retorno seja baixo.",
                    "Aceito pequenos riscos para obter um retorno um pouco maior.",
                    "Estou disposto a correr grandes riscos para maximizar meus ganhos."
                ]
            },
            investment_horizon: {
                question: "Por quanto tempo você pretende manter seus investimentos antes de precisar do dinheiro?",
                options: [
                    "Menos de 1 ano.",
                    "Entre 1 e 5 anos.",
                    "Mais de 5 anos."
                ]
            },
            market_reaction: {
                question: "O que você faria se seu investimento perdesse 20% do valor em um curto período?",
                options: [
                    "Venderia imediatamente para evitar mais perdas.",
                    "Aguardaria para ver se o mercado se recupera.",
                    "Compraria mais, aproveitando a queda para investir mais barato."
                ]
            },
            investment_goal: {
                question: "Qual é o principal objetivo dos seus investimentos?",
                options: [
                    "Preservação de capital, evitar perdas.",
                    "Crescimento moderado do patrimônio ao longo do tempo.",
                    "Altos ganhos, mesmo que haja maior volatilidade."
                ]
            }

        };

        const profile = await this.investorProfileRepository.createQueryBuilder('investor_profile')
            .where('investor_profile.user_id = :user_id', { user_id: userId })
            .getOne();

        if (!profile) {
            throw new HttpException('Perfil de investidor não encontrado.', 404);
        }

        const profileResponse = [];
        const answersMap = {
            "A": 0,
            "B": 1,
            "C": 2
        }

        for (const key in questionsData) {
            if (Object.prototype.hasOwnProperty.call(questionsData, key)) {
                const question = questionsData[key];
                profileResponse.push({
                    id: key,
                    question: question.question,
                    answer: question.options[answersMap[profile[key]]]
                });
            }
        }

        return {
            profileResponse,
            profile: profile.profile,
        };
    }
}
