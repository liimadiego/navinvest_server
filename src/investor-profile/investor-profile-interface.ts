export interface investorProfileAnswers {
    experience: 'A' | 'B' | 'C';
    risk_tolerance: 'A' | 'B' | 'C';
    investment_horizon: 'A' | 'B' | 'C';
    market_reaction: 'A' | 'B' | 'C';
    investment_goal: 'A' | 'B' | 'C';
}

export interface InvestorProfileResponse {
    success: boolean;
    data: {
        id: string;
        experience: 'A' | 'B' | 'C';
        risk_tolerance: 'A' | 'B' | 'C';
        investment_horizon: 'A' | 'B' | 'C';
        market_reaction: 'A' | 'B' | 'C';
        investment_goal: 'A' | 'B' | 'C';
        profile: InvestorProfile;
        created_at: string;
    };
}

export type InvestorProfile = 'Conservador' | 'Moderado' | 'Agressivo';