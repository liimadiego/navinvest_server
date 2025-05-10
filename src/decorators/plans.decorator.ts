import { SetMetadata } from '@nestjs/common';

export const IS_STARTER_PLAN_KEY = 'isStarterPlan';
export const StarterPlan = () => SetMetadata(IS_STARTER_PLAN_KEY, true);

export const IS_PRO_PLAN_KEY = 'isProPlan';
export const ProPlan = () => SetMetadata(IS_PRO_PLAN_KEY, true);

export const IS_PREMIUM_PLAN_KEY = 'isPremiumPlan';
export const PremiumPlan = () => SetMetadata(IS_PREMIUM_PLAN_KEY, true);