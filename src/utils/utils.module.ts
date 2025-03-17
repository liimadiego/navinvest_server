import { Module } from '@nestjs/common';
import { LanguagesService } from './language.service';
import { PromptsService } from './prompts.service';

@Module({
    providers: [LanguagesService, PromptsService],
    exports: [LanguagesService, PromptsService],
})
export class UtilsModule { }