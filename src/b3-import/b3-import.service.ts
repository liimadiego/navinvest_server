import { Injectable } from '@nestjs/common';
import { UsersService } from 'users/users.service';
import { PortfolioTransactionsService } from 'portfolio-transactions/portfolio-transactions.service';

import * as fs from 'fs';
import * as https from 'https';
import fetch from 'node-fetch'; // só se precisar em Node <18

const httpsAgent = new https.Agent({
    cert: fs.readFileSync(process.env.B3_CERT_PATH),
    key:  fs.readFileSync(process.env.B3_KEY_PATH),
    passphrase: process.env.B3_PASSWORD,
    // rejectUnauthorized: false,  // corresponde ao curl --insecure (-k) 
});

@Injectable()
export class B3ImportService {
    tokenObject: any = undefined;
    
    constructor(
        private readonly usersService: UsersService,
        private readonly portfolioTransactionsService: PortfolioTransactionsService
    ) {}
    
    async getAuthToken () {
        if (this.tokenObject == undefined || Date.now() >= this.tokenObject.expires_on) {
            const r = await fetch(process.env.B3_AUTH_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'grant_type': 'client_credentials',
                    'client_id': process.env.B3_CLIENT_ID,
                    'client_secret': process.env.B3_CLIENT_SECRET,
                    'scope': 'abae5dfa-65e6-47c1-82ec-a54a8a3213b9/.default',
                })
            });
            
            if (!r.ok) {
                throw new Error(`Failed to fetch auth token: ${r.status} ${r.statusText}`);
            }

            this.tokenObject = await r.json();
            this.tokenObject.created_at = Date.now() - 5e3; // To avoid issues with clock skew
            this.tokenObject.expires_on = this.tokenObject.created_at + (this.tokenObject.expires_in * 1000);
        }

        return this.tokenObject;
    }

    async importUserTransactions (userId: string, portfolioId: string) {
        const token = await this.getAuthToken();
        const user = await this.usersService.findById(userId);

        if (!user.cpf) {
            throw new Error('Usuário não possui CPF cadastrado'); 
        }

        const startDate = (user.b3ImportLastTime || new Date('2019-11-01T00:00:00-0300')).toISOString().split('T')[0];
        const endDate = new Date(Date.now() - (60e3*60*24) - (60e3*60*3)).toISOString().split('T')[0];

        let b3PeriodLists = [];
        let page = 1;
        let r = undefined;
        do {
            r = await fetch(
                `https://investidor.b3.com.br:2443/api/assets-trading/v2/investors/${user.cpf}?`+
                `referenceStartDate=${startDate}`+
                `&referenceEndDate=${endDate}`+
                `&page=${page}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + token.access_token,
                    },
                    agent: httpsAgent
                }
            );

            if (!r.ok) {
                throw new Error(`Failed to fetch user transactions: ${r.status} ${r.statusText}`);
            }

            if (r.status === 200) {
                const json = await r.json();

                b3PeriodLists = b3PeriodLists.concat(json.data.periods.periodLists);
                page++;
            }
            
        } while (r.status !== 204);

        return this.portfolioTransactionsService.createTransactionFromWalletImportDataB3(b3PeriodLists, portfolioId);
    }
}
