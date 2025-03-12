import { IsArray, IsObject, IsEnum, IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, ArrayNotEmpty, ArrayUnique, Min, Max, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PortfolioItem {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9:]+$/)
  ticker: string;

  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  @Max(1)
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
  @Matches(/^[A-Z]+$/)
  baseCurrency: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique(x => x.ticker)
  @IsObject({ each: true })
  @ValidateNested({ message: "ola" })
  @Type(() => PortfolioItem)
  portfolio: PortfolioItem[];
}
