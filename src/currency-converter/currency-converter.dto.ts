import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class currencyConverterRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]+$/)
  from: string
  
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]+$/)
  to: string
};