import { Module } from '@nestjs/common';
import { LanguagesService } from './language.service';
import { PromptsService } from './prompts.service';
import { MailService } from './mail.service';

@Module({
    providers: [LanguagesService, PromptsService, MailService],
    exports: [LanguagesService, PromptsService, MailService],
})
export class UtilsModule { }