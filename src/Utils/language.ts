import { Injectable } from '@nestjs/common';
import * as ptBR from '../config/languages/pt-br.json';
import * as en from '../config/languages/en.json';

@Injectable()
export class LanguagesService {

    getPhrase(item: string) {

        if (true) {
            return ptBR[item];
        }

        return en[item];
    }
}