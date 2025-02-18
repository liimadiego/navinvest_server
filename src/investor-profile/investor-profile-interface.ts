export interface investorProfileAnswers {
    experience: 'A' | 'B' | 'C';
    risk_tolerance: 'A' | 'B' | 'C';
    investment_horizon: 'A' | 'B' | 'C';
    market_reaction: 'A' | 'B' | 'C';
    investment_goal: 'A' | 'B' | 'C';
}

export type InvestorProfile = 'Conservador' | 'Moderado' | 'Agressivo';