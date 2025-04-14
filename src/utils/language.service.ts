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

    translateAssetType(assetType: string, currency: string): string {
        const type = assetType.toLowerCase();
        const currencyCode = currency.toUpperCase();

        if (type === 'stock' && currencyCode === 'BRL') return 'Ações';
        if (type === 'stock' && currencyCode === 'USD') return 'Stocks';

        const typeMap: Record<string, string> = {
            fii: 'FIIs',
            etf: 'ETFs',
            bdr: 'BDRs',
            reit: 'REITs',
            crypto: 'Criptomoedas',
            stablecoin: 'Criptomoedas',
        };

        return typeMap[type] || 'Others';
    }
}