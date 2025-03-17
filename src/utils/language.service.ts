import { Injectable } from '@nestjs/common';
import * as ptBR from '../config/languages/pt-br.json';
import * as en from '../config/languages/en.json';

@Injectable()
export class LanguagesService {

    getPhrase(item: string) {
        //verifica se já tem no cache a info
        //se nao, verifica no banco o pais do usuario

        if (true) {
            return ptBR[item];
        }

        return en[item];
    }
}