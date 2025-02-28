import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class currencyConverterRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]+$/, {
    message: 'O código da moeda "from" deve conter apenas letras maiúsculas.',
  })
  from: string
  
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]+$/, {
    message: 'O código da moeda "to" deve conter apenas letras maiúsculas.',
  })
  to: string
};