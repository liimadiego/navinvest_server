import { IsUUID, IsNumber, IsString, IsOptional, IsIn } from 'class-validator';

export class CreatePortfolioTransactionDto {
    @IsUUID()
    portfolio_id: string;

    @IsOptional()
    @IsNumber()
    ticker_id?: number;

    @IsOptional()
    @IsNumber()
    treasury_id?: number;

    @IsOptional()
    @IsString()
    tresury_id?: number;

    @IsIn(['BUY', 'SELL', 'DIVIDEND', 'SPLIT', 'TRANSFER'])
    transaction_type: string;

    @IsNumber()
    amount: number;

    @IsOptional()
    @IsNumber()
    price_per_unit?: number;

    @IsOptional()
    @IsNumber()
    quantity: number;

    @IsIn(['FII', 'STOCK', 'REIT', 'ETF', 'MUTUAL_FUND', 'FIXED_INCOME', 'TREASURY', 'CRYPTO', 'BDR'])
    asset_type: string;

    @IsOptional()
    transaction_date?: Date;

    //apenas para transações de renda fixa
    @IsOptional()
    @IsString()
    issuer?: string;

    @IsOptional()
    @IsIn(['LCI', 'CDB', 'LCA', 'LC', 'LF', 'RDB', 'DEBENTURE', 'CRI', 'CRA', 'CCB'])
    investment_type?: 'LCI' | 'CDB' | 'LCA' | 'LC' | 'LF' | 'RDB' | 'DEBENTURE' | 'CRI' | 'CRA' | 'CCB';

    @IsOptional()
    @IsIn(['PRE_FIXED', 'POST_FIXED'])
    indexation_type?: 'PRE_FIXED' | 'POST_FIXED';

    @IsOptional()
    expiration_date?: Date;

    @IsOptional()
    @IsIn(['CDI', 'CDI+', 'IPCA+'])
    indexer?: 'CDI' | 'CDI+' | 'IPCA+';

    @IsOptional()
    @IsIn(['BRL', 'USD'])
    currency?: 'BRL' | 'USD';

    @IsOptional()
    @IsNumber()
    indexer_rate?: number;

}