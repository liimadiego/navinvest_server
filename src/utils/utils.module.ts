import { Module } from '@nestjs/common';
import { LanguagesService } from './language.service';
import { PromptsService } from './prompts.service';
import { MailService } from './mail.service';
import { QuotesService } from './quotes.service';

@Module({
    providers: [LanguagesService, PromptsService, MailService, QuotesService],
    exports: [LanguagesService, PromptsService, MailService, QuotesService],
})
export class UtilsModule { }