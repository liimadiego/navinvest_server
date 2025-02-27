import { Body, Controller, Post } from "@nestjs/common";
import { CurrencyConverterService } from "./currency-converter.service";
import { currencyConverterRequestDto } from "./currency-converter.dto";

@Controller('currency-converter')
export class CurrencyConverterController {
  constructor(private currencyConverterService: CurrencyConverterService) {}

  @Post('convert')
  convert (@Body() body: currencyConverterRequestDto) {
    return this.currencyConverterService.convert(body);
  }
};