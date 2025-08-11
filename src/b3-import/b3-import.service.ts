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
    lastLoadObject: any = undefined;
    
    constructor(
        private readonly usersService: UsersService,
        private readonly portfolioTransactionsService: PortfolioTransactionsService
    ) {}
    
    async getB3AuthToken () {
        if (this.tokenObject == undefined || Date.now() >= this.tokenObject.expiresOn) {
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
                try {
                    const json = await r.json();
                    throw new Error(`[E] Fetching B3 auth token > HTTP (${r.status}) ${r.statusText}: (${json.code}) ${json.message}`);
                } catch (error) {
                    throw new Error(`[E] Fetching B3 auth token: HTTP (${r.status}) ${r.statusText}`);
                }
            }

            this.tokenObject = await r.json();
            this.tokenObject.createdAt = Date.now() - 5e3; // To avoid issues with clock skew
            this.tokenObject.expiresOn = this.tokenObject.createdAt + (this.tokenObject.expires_in * 1000);
        }

        return this.tokenObject;
    }

    async getB3LastLoadUpdate (authToken: string) {
        if (this.lastLoadObject == undefined || Date.now() >= this.lastLoadObject.expiresOn) {
            const r = await fetch(
                `https://investidor.b3.com.br:2443/api/system/v1/last-load-update`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + authToken,
                    },
                    agent: httpsAgent
                }
            );

            if (!r.ok) {
                try {
                    const json = await r.json();
                    throw new Error(`[E] Failed to get B3 last load update > HTTP (${r.status}) ${r.statusText}: (${json.code}) ${json.message}`);
                } catch (error) {
                    throw new Error(`[E] Failed to get B3 last load update: HTTP (${r.status}) ${r.statusText}`);
                }
            }

            const json = await r.json();
            const createdAt = Date.now() - 5e3; // To avoid issues with clock skew
            this.lastLoadObject = {
                lastLoadedDate: json.data.lastLoadedDate,
                createdAt,
                expiresOn: createdAt + (15*60e3) // expires in 15 minute(s)
            };
        }

        return this.lastLoadObject.lastLoadedDate;
    }

    async getB3UserTradesPeriodLists (authToken: string, userCpf: number, startDate: string, endDate: string) {
        // console.log(`Getting B3 user trades period lists for user "${userCpf}" from "${startDate}" to "${endDate}"...`);

        let b3PeriodLists = [];
        let page = 1;
        let r = undefined;
        do {
            r = await fetch(
                `https://investidor.b3.com.br:2443/api/assets-trading/v2/investors/${userCpf}?`+
                `referenceStartDate=${startDate}`+
                `&referenceEndDate=${endDate}`+
                `&page=${page}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + authToken,
                    },
                    agent: httpsAgent
                }
            );

            if (!r.ok) {
                try {
                    const json = await r.json();
                    throw new Error(`[E] Failed to import user (${userCpf}) trades from B3 > HTTP (${r.status}) ${r.statusText}: (${json.code}) ${json.message}`);
                } catch (error) {
                    throw new Error(`[E] Failed to import user (${userCpf}) trades from B3: HTTP (${r.status}) ${r.statusText}`);
                }
            }

            if (r.status === 200) {
                const json = await r.json();

                b3PeriodLists = b3PeriodLists.concat(json.data.periods.periodLists);
                page++;
            }
            
        } while (r.status !== 204);

        return b3PeriodLists;
    }

    async getB3UserEquitiesMovements (authToken: string, userCpf: number, startDate: string, endDate: string) {
        // console.log(`Getting B3 user equities movements lists for user "${userCpf}" from "${startDate}" to "${endDate}"...`);

        let b3EquitiesMovements = [];
        let page = 1;
        let r = undefined;
        do {
            r = await fetch(
                `https://investidor.b3.com.br:2443/api/movement/v2/equities/investors/${userCpf}?`+
                `referenceStartDate=${startDate}`+
                `&referenceEndDate=${endDate}`+
                `&page=${page}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + authToken,
                    },
                    agent: httpsAgent
                }
            );

            if (!r.ok) {
                try {
                    const json = await r.json();
                    throw new Error(`[E] Failed to import user (${userCpf}) equities movements from B3 > HTTP (${r.status}) ${r.statusText}: (${json.code}) ${json.message}`);
                } catch (error) {
                    throw new Error(`[E] Failed to import user (${userCpf}) equities movements from B3: HTTP (${r.status}) ${r.statusText}`);
                }
            }

            if (r.status === 200) {
                const json = await r.json();

                b3EquitiesMovements = b3EquitiesMovements.concat(json.data.equitiesPeriods.equitiesMovements);
                page++;
            }

        } while (r.status !== 204);

        return b3EquitiesMovements;
    }

    adjustB3UserTransactions (userCpf: number, b3PeriodLists: any[], b3EquitiesMovements: any[]) {
        const transactions = [];

        for (const period of b3PeriodLists) {
            if (!period?.assetTradingList?.length) {
                console.log('wired period:', period);
            }

            for (const assetTrading of period.assetTradingList) {
                assetTrading._type = 'assetTrading';
                assetTrading._timestamp = new Date(assetTrading.tradeDateTime+'-0300').getTime();
                transactions.push(assetTrading);
            }
        }

        for (const equityMovement of b3EquitiesMovements) {
            equityMovement._type = 'equityMovement';
            equityMovement._timestamp = new Date(equityMovement.referenceDate+'T00:00:00-0300').getTime();
            transactions.unshift(equityMovement);
        }

        transactions.sort((a, b) => a._timestamp - b._timestamp);

        const otherMovements = new Set([
            'Rendimento',
            'Juros Sobre Capital Próprio',
            'Direitos de Subscrição - Não Exercido',
            'Cessão de Direitos',
            'Cessão de Direitos - Solicitada',
            'Dividendo',
            'Transferência',
            'Direito de Subscrição',
            'Direitos de Subscrição - Exercido',
            'Solicitação de Subscrição'
        ]);
        const subscriptionsReceipt = {};
        const assetsBalance = {};
        const isinCodeToTickerSymbol = {};
        const dayOutOfTimeBaixas = {};
        const adjustedTransactions = [];

        for (let i = 0; i < transactions.length; i++) {
            const t = transactions[i];

            if (t._type === 'assetTrading') {
                t.tickerSymbol = (t.assetTradingObjectCode || t.tickerSymbol).trim();

                // Update balance.
                if (!assetsBalance[t.tickerSymbol]) {
                    assetsBalance[t.tickerSymbol] = { quantity: 0, cost: 0, avgPrice: 0 };
                }
                const balance = assetsBalance[t.tickerSymbol];
                if (t.side === 'Compra') {
                    balance.quantity += t.tradeQuantity;
                    balance.cost = Math.round((balance.cost + t.grossAmount) * 100) / 100;
                    balance.avgPrice = Math.round((balance.cost / balance.quantity) * 100) / 100;

                } else if (t.side === 'Venda') {
                    balance.quantity -= t.tradeQuantity;
                    balance.cost = Math.round((balance.quantity * balance.avgPrice) * 100) / 100;
                }
                
                t.balance = { ...balance };
                adjustedTransactions.push(t);

            } else if (t._type === 'equityMovement') {
                t.tickerSymbol = t.tickerSymbol.trim();

                if (t.movementType === 'Transferência - Liquidação') {
                    isinCodeToTickerSymbol[t.isinCode] = t.tickerSymbol;

                } else if (t.movementType === 'Recibo de Subscrição') {
                    subscriptionsReceipt[t.isinCode] = t;

                } else if (
                    t.movementType === 'Atualização' ||
                    t.movementType === 'Incorporação'
                ) {
                    if (t.operationType === 'Credito') {
                        const subscriptionReceipt = subscriptionsReceipt[t.baseIsinCode];
                        const timestamp = subscriptionReceipt?._timestamp || t._timestamp;
                        const dateTime = new Date(timestamp - 60e3*60*3).toISOString().slice(0, 19);
                        
                        const baseTicker = isinCodeToTickerSymbol[t.baseIsinCode];
                        const baseTickerBalance = assetsBalance[baseTicker];

                        if (
                            t.movementType === 'Atualização' && 
                            (!subscriptionReceipt) && 
                            t.isinCode === t.baseIsinCode && 
                            t.equitiesQuantity === assetsBalance[t.tickerSymbol].quantity
                        ) {
                            // Can safely ignore this.
                            continue;
                        }

                        // Credita o 'isinCode/tickerSymbol' com o custo de aquisição do 'baseIsinCode'
                        let creditReference = undefined;
                        if (!dayOutOfTimeBaixas[t.referenceDate]?.[t.isinCode]) {
                            creditReference = {
                                tickerSymbol: t.tickerSymbol,
                                side: 'Compra',
                                marketName: `Ajuste: ${(subscriptionReceipt ? 'Subscrição' : t.movementType)}`,
                                expirationDate: '9999-12-31',
                                participantName: '',
                                participantDocumentNumber: '',
                                optionExerciseValue: 0,
                                tradeQuantity: t.equitiesQuantity,
                                priceValue: Math.round(((baseTickerBalance?.cost || 0) / t.equitiesQuantity) * 100) / 100,
                                grossAmount: (baseTickerBalance?.cost || 0),
                                originalTotalAdjustmentValue: 0,
                                originalTradePriceValue: 0,
                                tradeDateTime: dateTime,
                                participantCode: '',
                                accountNumber: '',
                                _type: 'Adjustment',
                                _timestamp: timestamp,
                                _adjustmentDescription: `Ajuste - ${(subscriptionReceipt ? 'Subscrição' : t.movementType)}`
                            };

                            // Atualiza 'balance'.
                            if (subscriptionReceipt) {
                                assetsBalance[t.tickerSymbol].quantity += t.equitiesQuantity;
                                assetsBalance[t.tickerSymbol].avgPrice = Math.round((assetsBalance[t.tickerSymbol].cost / assetsBalance[t.tickerSymbol].quantity) * 100) / 100;
                            } else {
                                assetsBalance[t.tickerSymbol] = { 
                                    ...baseTickerBalance, 
                                    quantity: t.equitiesQuantity,
                                    avgPrice: Math.round(((baseTickerBalance?.cost || 0) / t.equitiesQuantity) * 100) / 100
                                };
                            }

                            creditReference.balance = { ...assetsBalance[t.tickerSymbol] };
                            adjustedTransactions.push(creditReference);

                        } else {
                            // Remove the 'dayOutOfTimeBaixas' entry
                            const { creditReference } = dayOutOfTimeBaixas[t.referenceDate][t.isinCode];
                            if (creditReference) {
                                creditReference.grossAmount = baseTickerBalance?.cost || 0;
                                creditReference.priceValue = Math.round((creditReference.grossAmount / creditReference.tradeQuantity) * 100) / 100;
                                creditReference.balance.cost = Math.round(((creditReference.balance.cost || 0) + creditReference.grossAmount) * 100) / 100;
                                creditReference.balance.avgPrice = Math.round((creditReference.balance.cost / creditReference.balance.quantity) * 100) / 100;

                                // Atualiza 'balance'.
                                const balance = assetsBalance[creditReference.tickerSymbol];
                                if (balance) {
                                    balance.cost = Math.round(((balance.cost || 0) + creditReference.grossAmount) * 100) / 100;
                                    balance.avgPrice = Math.round((balance.cost / balance.quantity) * 100) / 100;
                                }
                            }

                            delete dayOutOfTimeBaixas[t.referenceDate][t.isinCode];
                        }

                        if (!subscriptionReceipt) {
                            // Da baixa no 'baseIsinCode'
                            if (baseTicker && assetsBalance[baseTicker]) {
                                adjustedTransactions.push({
                                    tickerSymbol: baseTicker,
                                    side: 'Venda',
                                    marketName: `Ajuste: ${t.movementType}`,
                                    expirationDate: '9999-12-31',
                                    participantName: '',
                                    participantDocumentNumber: '',
                                    optionExerciseValue: 0,
                                    tradeQuantity: baseTickerBalance.quantity,
                                    priceValue: 0,
                                    grossAmount: 0,
                                    originalTotalAdjustmentValue: 0,
                                    originalTradePriceValue: 0,
                                    tradeDateTime: dateTime,
                                    participantCode: '',
                                    accountNumber: '',
                                    _type: 'Adjustment',
                                    _timestamp: timestamp,
                                    _adjustmentDescription: `Ajuste - ${t.movementType}`,
                                    balance: { quantity: 0, cost: 0, avgPrice: 0 }
                                });

                                // Atualiza 'balance'.
                                delete assetsBalance[baseTicker];

                            } else {
                                if (!dayOutOfTimeBaixas[t.referenceDate]) {
                                    dayOutOfTimeBaixas[t.referenceDate] = {};
                                }
                                dayOutOfTimeBaixas[t.referenceDate][t.baseIsinCode] = { creditReference };

                                // console.error(`[E] B3 Import (User doc= ${userCpf}) > Base ticker balance not found for "${t.movementType}" adjustment (${t.baseIsinCode} - ${t.tickerSymbol}):`, t);
                                // throw `Base ticker balance (${baseTicker}) not found for adjustment.`;
                            }
                        }

                    } else {
                        // Não sei como lidar...
                        console.error(`[E] B3 Import (User doc= ${userCpf}) > Unknow equity movement operation type (${t.movementType} - ${t.operationType}):`, t);
                    }

                } else if (
                    t.movementType === 'Leilão de Fração' ||
                    t.movementType === 'Restituição de Capital'
                ) {
                    if (t.operationType === 'Credito') {

                        // Atualiza 'balance'.
                        assetsBalance[t.tickerSymbol].cost = Math.round((assetsBalance[t.tickerSymbol].cost - t.operationValue) * 100) / 100;
                        assetsBalance[t.tickerSymbol].avgPrice = Math.round((assetsBalance[t.tickerSymbol].cost / assetsBalance[t.tickerSymbol].quantity) * 100) / 100;

                        // Adiciona um ajuste de venda para liquidar a posição por completa
                        adjustedTransactions.push({
                            tickerSymbol: t.tickerSymbol,
                            side: 'Venda',
                            marketName: `Ajuste: ${t.movementType}`,
                            expirationDate: '9999-12-31',
                            participantName: '',
                            participantDocumentNumber: '',
                            optionExerciseValue: 0,
                            tradeQuantity: assetsBalance[t.tickerSymbol].quantity,
                            priceValue: 0,
                            grossAmount: t.operationValue,
                            originalTotalAdjustmentValue: 0,
                            originalTradePriceValue: 0,
                            tradeDateTime: new Date(t._timestamp - 60e3*60*3).toISOString().slice(0, 19),
                            participantCode: '',
                            accountNumber: '',
                            _type: 'Adjustment',
                            _timestamp: t._timestamp,
                            _adjustmentDescription: `Ajuste - ${t.movementType}`,
                            balance: { quantity: 0, cost: 0, avgPrice: 0 }
                        });
                        
                        // Adiciona um ajuste de compra com o custo de aquisição atualizado.
                        adjustedTransactions.push({
                            tickerSymbol: t.tickerSymbol,
                            side: 'Compra',
                            marketName: `Ajuste: ${t.movementType}`,
                            expirationDate: '9999-12-31',
                            participantName: '',
                            participantDocumentNumber: '',
                            optionExerciseValue: 0,
                            tradeQuantity: assetsBalance[t.tickerSymbol].quantity,
                            priceValue: assetsBalance[t.tickerSymbol].avgPrice,
                            grossAmount: assetsBalance[t.tickerSymbol].cost,
                            originalTotalAdjustmentValue: 0,
                            originalTradePriceValue: 0,
                            tradeDateTime: new Date(t._timestamp - 60e3*60*3).toISOString().slice(0, 19),
                            participantCode: '',
                            accountNumber: '',
                            _type: 'Adjustment',
                            _timestamp: t._timestamp,
                            _adjustmentDescription: `Ajuste - ${t.movementType}`,
                            balance: { ...assetsBalance[t.tickerSymbol] }
                        });

                    } else {
                        // Não sei como lidar...
                        console.error(`[E] B3 Import (User doc= ${userCpf}) > Unknow equity movement operation type (${t.movementType} - ${t.operationType}):`, t);
                    }

                } else if (t.movementType === 'Desdobro') {
                    if (t.operationType === 'Credito') {

                        // Valida o 'balance' atual
                        const assetBalance = assetsBalance[t.tickerSymbol];
                        if ((!assetBalance) || assetBalance.quantity === 0) {
                            console.error(`[E] B3 Import (User doc= ${userCpf}) > Asset balance not found for "${t.movementType}" adjustment (${t.tickerSymbol}):`, t);
                            throw `Asset balance (${t.tickerSymbol}) not found for "${t.movementType}" adjustment.`;
                        }

                        // Atualiza 'balance'
                        assetsBalance[t.tickerSymbol].quantity += t.equitiesQuantity;
                        assetsBalance[t.tickerSymbol].avgPrice = Math.round((assetsBalance[t.tickerSymbol].cost / assetsBalance[t.tickerSymbol].quantity) * 100) / 100;

                        adjustedTransactions.push({
                            tickerSymbol: t.tickerSymbol,
                            side: 'Compra',
                            marketName: `Ajuste: ${t.movementType}`,
                            expirationDate: '9999-12-31',
                            participantName: '',
                            participantDocumentNumber: '',
                            optionExerciseValue: 0,
                            tradeQuantity: t.equitiesQuantity,
                            priceValue: 0,
                            grossAmount: 0,
                            originalTotalAdjustmentValue: 0,
                            originalTradePriceValue: 0,
                            tradeDateTime: new Date(t._timestamp - 60e3*60*3).toISOString().slice(0, 19),
                            participantCode: '',
                            accountNumber: '',
                            _type: 'Adjustment',
                            _timestamp: t._timestamp,
                            _adjustmentDescription: `Ajuste - ${t.movementType}`,
                            balance: { ...assetsBalance[t.tickerSymbol] }
                        });
                    } else {
                        // Não sei como lidar...
                        console.error(`[E] B3 Import (User doc= ${userCpf}) > Unknow equity movement operation type (${t.movementType} - ${t.operationType}):`, t);
                    }

                } else if (t.movementType === 'Grupamento') {
                    if (t.operationType === 'Credito') {
                        // Seta o 'balance.quantity' = 't.equitiesQuantity'

                        // Valida o 'balance' atual
                        const assetBalance = assetsBalance[t.tickerSymbol];
                        if ((!assetBalance) || assetBalance.quantity === 0) {
                            console.error(`[E] B3 Import (User doc= ${userCpf}) > Asset balance not found for "${t.movementType}" adjustment (${t.tickerSymbol}):`, t);
                            throw `Asset balance (${t.tickerSymbol}) not found for "${t.movementType}" adjustment.`;
                        }

                        // Atualiza 'balance'
                        const balanceBefore = { ...assetsBalance[t.tickerSymbol] };
                        assetsBalance[t.tickerSymbol].quantity = t.equitiesQuantity;
                        assetsBalance[t.tickerSymbol].avgPrice = Math.round((assetsBalance[t.tickerSymbol].cost / t.equitiesQuantity) * 100) / 100;
                        
                        // Adiciona um ajuste de venda para liquidar a posição por completa
                        adjustedTransactions.push({
                            tickerSymbol: t.tickerSymbol,
                            side: 'Venda',
                            marketName: `Ajuste: ${t.movementType}`,
                            expirationDate: '9999-12-31',
                            participantName: '',
                            participantDocumentNumber: '',
                            optionExerciseValue: 0,
                            tradeQuantity: balanceBefore.quantity,
                            priceValue: 0,
                            grossAmount: 0,
                            originalTotalAdjustmentValue: 0,
                            originalTradePriceValue: 0,
                            tradeDateTime: new Date(t._timestamp - 60e3*60*3).toISOString().slice(0, 19),
                            participantCode: '',
                            accountNumber: '',
                            _type: 'Adjustment',
                            _timestamp: t._timestamp,
                            _adjustmentDescription: `Ajuste - ${t.movementType}`,
                            balance: { quantity: 0, cost: 0, avgPrice: 0 }
                        });

                        // Adiciona um ajuste de compra com o custo de aquisição atualizado.
                        adjustedTransactions.push({
                            tickerSymbol: t.tickerSymbol,
                            side: 'Compra',
                            marketName: `Ajuste: ${t.movementType}`,
                            expirationDate: '9999-12-31',
                            participantName: '',
                            participantDocumentNumber: '',
                            optionExerciseValue: 0,
                            tradeQuantity: t.equitiesQuantity,
                            priceValue: assetsBalance[t.tickerSymbol].avgPrice,
                            grossAmount: assetsBalance[t.tickerSymbol].cost,
                            originalTotalAdjustmentValue: 0,
                            originalTradePriceValue: 0,
                            tradeDateTime: new Date(t._timestamp - 60e3*60*3).toISOString().slice(0, 19),
                            participantCode: '',
                            accountNumber: '',
                            _type: 'Adjustment',
                            _timestamp: t._timestamp,
                            _adjustmentDescription: `Ajuste - ${t.movementType}`,
                            balance: { ...assetsBalance[t.tickerSymbol] }
                        });

                    } else {
                        // Não sei como lidar...
                        console.error(`[E] B3 Import (User doc= ${userCpf}) > Unknow equity movement operation type (${t.movementType} - ${t.operationType}):`, t);
                    }

                } else if (t.movementType === 'Fração em Ativos') {
                    if (t.operationType === 'Debito') {

                        // Valida o 'balance' atual
                        const assetBalance = assetsBalance[t.tickerSymbol];
                        if ((!assetBalance) || assetBalance.quantity === 0) {
                            console.error(`[E] B3 Import (User doc= ${userCpf}) > Asset balance not found for "${t.movementType}" adjustment (${t.tickerSymbol}):`, t);
                            throw `Asset balance (${t.tickerSymbol}) not found for "${t.movementType}" adjustment.`;
                        }

                        const balanceDecimals = assetBalance.quantity.toString().split('.')[1];
                        const updateDecimals = t.equitiesQuantity.toString().split('.')[1];

                        if (balanceDecimals === updateDecimals) {

                            // Atualiza 'balance'
                            assetBalance.quantity = Math.floor(assetBalance.quantity);
                            assetBalance.avgPrice = Math.round((assetBalance.cost / assetBalance.quantity) * 100) / 100;
                            
                            adjustedTransactions.push({
                                tickerSymbol: t.tickerSymbol,
                                side: 'Venda',
                                marketName: `Ajuste: ${t.movementType}`,
                                expirationDate: '9999-12-31',
                                participantName: '',
                                participantDocumentNumber: '',
                                optionExerciseValue: 0,
                                tradeQuantity: t.equitiesQuantity,
                                priceValue: 0,
                                grossAmount: 0,
                                originalTotalAdjustmentValue: 0,
                                originalTradePriceValue: 0,
                                tradeDateTime: new Date(t._timestamp - 60e3*60*3).toISOString().slice(0, 19),
                                participantCode: '',
                                accountNumber: '',
                                _type: 'Adjustment',
                                _timestamp: t._timestamp,
                                _adjustmentDescription: `Ajuste - ${t.movementType}`,
                                balance: { ...assetBalance }
                            });

                        } else {
                            // Assume the balance have already been updated for some reason and the decimal debit is not necessary.
                            console.error(`[E] B3 Import (User doc= ${userCpf}) > Asset balance quantity decimals mismatch for "${t.movementType}" adjustment (${t.tickerSymbol}):`, t);
                        }

                    } else {
                        // Não sei como lidar...
                        console.error(`[E] B3 Import (User doc= ${userCpf}) > Unknow equity movement operation type (${t.movementType} - ${t.operationType}):`, t);
                    }

                } else if (t.movementType === 'Bonificação em Ativos') {
                    if (t.operationType === 'Credito') {

                        // Valida o 'balance' atual
                        const assetBalance = assetsBalance[t.tickerSymbol];
                        if (!assetBalance) {
                            console.error(`[E] B3 Import (User doc= ${userCpf}) > Asset balance not found for "${t.movementType}" adjustment (${t.tickerSymbol}):`, t);
                            throw `Asset balance (${t.tickerSymbol}) not found for "${t.movementType}" adjustment.`;
                        }

                        // Atualiza 'balance'
                        assetBalance.quantity += t.equitiesQuantity;
                        assetBalance.avgPrice = Math.round((assetBalance.cost / assetBalance.quantity) * 100) / 100;

                        adjustedTransactions.push({
                            tickerSymbol: t.tickerSymbol,
                            side: 'Compra',
                            marketName: `Ajuste: ${t.movementType}`,
                            expirationDate: '9999-12-31',
                            participantName: '',
                            participantDocumentNumber: '',
                            optionExerciseValue: 0,
                            tradeQuantity: t.equitiesQuantity,
                            priceValue: 0,
                            grossAmount: 0,
                            originalTotalAdjustmentValue: 0,
                            originalTradePriceValue: 0,
                            tradeDateTime: new Date(t._timestamp - 60e3*60*3).toISOString().slice(0, 19),
                            participantCode: '',
                            accountNumber: '',
                            _type: 'Adjustment',
                            _timestamp: t._timestamp,
                            _adjustmentDescription: `Ajuste - ${t.movementType}`,
                            balance: { ...assetBalance }
                        });

                    } else {
                        // Não sei como lidar...
                        console.error(`[E] B3 Import (User doc= ${userCpf}) > Unknow equity movement operation type (${t.movementType} - ${t.operationType}):`, t);
                    }

                } else if (!otherMovements.has(t.movementType)) {
                    console.error(`[E] B3 Import (User doc= ${userCpf}) > Unknow equity movement type (${t.movementType}):`, t);
                }
            }
        }

        const dayOutOfTimeBaixasCount = Object.values(dayOutOfTimeBaixas).filter(values => Object.keys(values).length).length;
        if (dayOutOfTimeBaixasCount > 0) {
            console.error(`[E] B3 Import (User doc= ${userCpf}) > Found ${dayOutOfTimeBaixasCount} day out of time baixas that were not processed. This import may be wrong.`);
        }

        return adjustedTransactions;
    }

    async importB3UserTransactions (userId: string, portfolioId: string) {
        const user = await this.usersService.findById(userId);
        if (!user.cpf) {
            throw new Error('Usuário não possui CPF cadastrado'); 
        }

        const token = await this.getB3AuthToken();

        const startDate = (user.b3ImportLastTime || new Date('2019-11-01T00:00:00-0300')).toISOString().split('T')[0];
        // const endDate = new Date(Date.now() - (60e3*60*24) - (60e3*60*3)).toISOString().split('T')[0];
        const endDate = (await this.getB3LastLoadUpdate(token.access_token)).split('T')[0];

        const [ b3PeriodLists, b3EquitiesMovements ] = await Promise.all([
            this.getB3UserTradesPeriodLists(token.access_token, user.cpf, startDate, endDate),
            this.getB3UserEquitiesMovements(token.access_token, user.cpf, startDate, endDate)
        ]);

        const adjustedTransactions = this.adjustB3UserTransactions(user.cpf, b3PeriodLists, b3EquitiesMovements);

        return this.portfolioTransactionsService.createTransactionFromWalletImportDataB3(adjustedTransactions, portfolioId);
    }
}
