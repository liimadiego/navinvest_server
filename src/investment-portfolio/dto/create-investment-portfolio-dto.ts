import { IsString, IsEnum, IsUUID } from 'class-validator';

export class CreateInvestmentPortfolioDto {
    @IsUUID()
    userId: string;

    @IsString()
    name: string;

    @IsEnum(['Dividendos', 'Longo Prazo', 'Aposentadoria', 'Valorização de Capital', 'Renda Passiva', 'Especulação', 'Proteção Patrimonial', 'Diversificação Global'])
    objective: 'Dividendos' | 'Longo Prazo' | 'Aposentadoria' | 'Valorização de Capital' | 'Renda Passiva' | 'Especulação' | 'Proteção Patrimonial' | 'Diversificação Global';
}