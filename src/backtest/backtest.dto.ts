import { IsArray, IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, Min, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PortfolioItem {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9:]+$/, {
    message: 'O ticker deve conter apenas letras maiúsculas e números.',
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

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]+$/, {
    message: 'O código da moeda "baseCurrency" deve conter apenas letras maiúsculas.',
  })
  baseCurrency: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioItem)
  portfolio: PortfolioItem[];
}
