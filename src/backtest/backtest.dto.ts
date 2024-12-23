import { IsArray, IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, Min, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PortfolioItem {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9]+$/, {
    message: 'Ticker must contain only uppercase letters and numbers.',
  })
  ticker: string;

  @IsNumber()
  @IsPositive()
  weight: number;
}

export class BacktestRequestDto {
  @IsInt()
  @IsPositive()
  startDate: number;

  @IsInt()
  @IsPositive()
  endDate: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioItem)
  portfolio: PortfolioItem[];
}
