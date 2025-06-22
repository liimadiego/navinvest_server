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
            mutual_fund: 'Mutual Funds',
            fixed_income: 'Renda Fixa',
            treasury: 'Títulos Públicos',
            fii: 'FIIs',
            etf: 'ETFs',
            bdr: 'BDRs',
            reit: 'REITs',
            crypto: 'Criptomoedas',
            funds: 'Fundos',
            stablecoin: 'Criptomoedas',
        };

        return typeMap[type] || 'Others';
    }
}