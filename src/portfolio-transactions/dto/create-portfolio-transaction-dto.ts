import { IsUUID, IsNumber, IsString, IsOptional, IsIn } from 'class-validator';

export class CreatePortfolioTransactionDto {
    @IsUUID()
    portfolio_id: string;

    @IsNumber()
    ticker_id: number;

    @IsIn(['BUY', 'SELL', 'DIVIDEND', 'SPLIT', 'TRANSFER'])
    transaction_type: string;

    @IsNumber()
    amount: number;

    @IsOptional()
    @IsNumber()
    price_per_unit?: number;

    //quantity
    @IsNumber()
    quantity: number;

    // @IsOptional()
    // @IsNumber()
    // fees?: number;

    // @IsOptional()
    // @IsString()
    // notes?: string;

    @IsOptional()
    transaction_date?: Date;
}