import { Injectable, NotFoundException } from '@nestjs/common';
import { TickersEntity } from 'entities/tickers.entity';
import { InvestmentPortfolioEntity } from '../entities/investment-portfolio.entity';
import { PortfolioTransactionEntity } from 'entities/portfolio-transaction.entity';
import { FixedIncomeDetailsEntity } from 'entities/fixed-income-details.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePortfolioTransactionDto } from './dto/create-portfolio-transaction-dto';
import { LanguagesService } from 'utils/language.service';
import OpenAI from 'openai';
import * as path from 'path';
import * as csv from 'csv-parser';
import * as xlsx from 'xlsx';
import { Multer } from 'multer';
import { PromptsService } from '../utils/prompts.service';
@Injectable()
export class PortfolioTransactionsService {
    private openai: OpenAI;
    private prompts = new PromptsService().getPrompts();

    constructor(
        @InjectRepository(InvestmentPortfolioEntity)
        private readonly investmentPortfolioRepository: Repository<InvestmentPortfolioEntity>,
        @InjectRepository(TickersEntity)
        private readonly tickerRepository: Repository<TickersEntity>,
        @InjectRepository(PortfolioTransactionEntity)
        private readonly portfolioTransactionRepository: Repository<PortfolioTransactionEntity>,
        private readonly languagesService: LanguagesService,
        @InjectRepository(FixedIncomeDetailsEntity)
        private readonly fixedIncomeDetailsRepository: Repository<FixedIncomeDetailsEntity>,
    ) {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    async createTransactionFromWalletImportData(walletImportData: any, portfolioId: string): Promise<any> {
        const portfolioExists = await this.investmentPortfolioRepository.exists({ where: { id: portfolioId } });
        if (!portfolioExists) {
            throw new NotFoundException(`Portfolio with ID ${portfolioId} not found`);
        }

        // console.log('walletImportData', walletImportData);

        const { fixed_income, variable_income } = walletImportData;
        const transactions = [];

        const fixedIncomeTransactions = fixed_income.map((item: any) => {
            return {
                portfolio_id: portfolioId,
                asset_type: 'FIXED_INCOME',
                transaction_type: item.transaction_type,
                amount: item.amount,
                price_per_unit: item.amount,
                transaction_date: item.transaction_date,
                quantity: 1,
                issuer: item.issuer,
                investment_type: item.investment_type,
                indexation_type: item.indexation_type,
                expiration_date: item.expiration_date,
                indexer: item.indexer,
                currency: "BRL",
                indexer_rate: item.indexer_rate,
            };
        });

        const variableIncomeTransactions = await Promise.all(variable_income.map(async (item: any) => {
            const ticker = await this.tickerRepository.findOne({ where: { ticker: item.ticker } });
            if (!ticker) {
                throw new NotFoundException(`Ticker with name ${item.ticker} not found`);
            }
            const tickerId = ticker.id;

            return {
                portfolio_id: portfolioId,
                asset_type: ticker.asset_type.toUpperCase(),
                transaction_type: item.transaction_type,
                amount: item.amount,
                price_per_unit: item.price_per_unit,
                transaction_date: item.transaction_date,
                quantity: item.quantity,
                ticker_id: tickerId,
            };
        }));

        transactions.push(...fixedIncomeTransactions, ...variableIncomeTransactions);

        const savedTransactions = await Promise.all(transactions.map(async (transaction) => {
            await this.createTransaction(transaction);
            return transaction;
        }));

        return {
            success: true,
            message: 'Transações criadas com sucesso'
        };
    }

    async createTransaction(createDto: CreatePortfolioTransactionDto): Promise<any> {
        const portfolioExists = await this.investmentPortfolioRepository.exists({
            where: { id: createDto.portfolio_id }
        });

        if (!portfolioExists) {
            throw new NotFoundException(`Portfolio with ID ${createDto.portfolio_id} not found`);
        }

        if (createDto.ticker_id) {
            const tickerExists = await this.tickerRepository.exists({
                where: { id: createDto.ticker_id }
            });

            if (!tickerExists) {
                throw new NotFoundException(`Ticker with ID ${createDto.ticker_id} not found`);
            }
        }

        let fixedIncomeDetails = null;

        if (createDto.asset_type === 'FIXED_INCOME' && (
            !createDto.issuer ||
            !createDto.investment_type ||
            !createDto.indexation_type ||
            !createDto.expiration_date ||
            !createDto.indexer ||
            !createDto.currency ||
            !createDto.indexer_rate
        )) {
            throw new NotFoundException(`Missing required fields for fixed income transaction`);
        }

        if (createDto.asset_type === 'FIXED_INCOME') {
            fixedIncomeDetails = {
                issuer: createDto.issuer,
                investment_type: createDto.investment_type,
                indexation_type: createDto.indexation_type,
                expiration_date: createDto.expiration_date,
                indexer: createDto.indexer,
                currency: createDto.currency,
                indexer_rate: createDto.indexer_rate,
            };
        }

        const transaction = this.portfolioTransactionRepository.create({
            portfolio: { id: createDto.portfolio_id },
            ticker: createDto.ticker_id ? { id: createDto.ticker_id } : null,
            asset_type: createDto.asset_type,
            transaction_type: createDto.transaction_type,
            amount: createDto.amount,
            price_per_unit: createDto.price_per_unit || null,
            transaction_date: createDto.transaction_date || new Date(),
            quantity: createDto.quantity || 0,
            fixed_income_details: fixedIncomeDetails ? await this.fixedIncomeDetailsRepository.save(fixedIncomeDetails) : null,
        });

        return this.portfolioTransactionRepository.save(transaction);
    }

    async editTransaction(data: any): Promise<any> {
        let transaction: any;

        if (data.asset_type === 'FIXED_INCOME') {
            transaction = await this.portfolioTransactionRepository.findOne({
                where: { id: data.id },
                relations: ['fixed_income_details']
            });
        } else {
            transaction = await this.portfolioTransactionRepository.findOne({ where: { id: data.id } });
        }

        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${data.id} not found`);
        }

        if (data.ticker_id) {
            const tickerExists = await this.tickerRepository.exists({
                where: { id: data.ticker_id }
            });

            if (!tickerExists) {
                throw new NotFoundException(`Ticker with ID ${data.ticker_id} not found`);
            }
        }

        if (data.asset_type === 'FIXED_INCOME' && (
            !data.issuer ||
            !data.investment_type ||
            !data.indexation_type ||
            !data.expiration_date ||
            !data.indexer ||
            !data.currency ||
            !data.indexer_rate
        )) {
            throw new NotFoundException(`Missing required fields for fixed income transaction`);
        }

        if (data.asset_type === 'FIXED_INCOME') {
            const fixed_income_details_data = {
                issuer: data.issuer,
                investment_type: data.investment_type,
                indexation_type: data.indexation_type,
                expiration_date: data.expiration_date,
                indexer: data.indexer,
                currency: data.currency,
                indexer_rate: data.indexer_rate,
            };

            const fixed_income_details = await this.fixedIncomeDetailsRepository.findOne({ where: { id: transaction.fixed_income_details.id } });

            if (!fixed_income_details) {
                throw new NotFoundException(`Fixed income details with ID ${transaction.fixed_income_details.id} not found`);
            }

            await this.fixedIncomeDetailsRepository.update(fixed_income_details.id, fixed_income_details_data);
            transaction.fixed_income_details = fixed_income_details;
        }

        transaction.portfolio = { id: data.portfolio_id };
        transaction.ticker = data.ticker_id ? { id: data.ticker_id } : null;
        transaction.asset_type = data.asset_type;
        transaction.transaction_type = data.transaction_type;
        transaction.amount = data.amount;
        transaction.price_per_unit = data.price_per_unit || null;
        transaction.transaction_date = data.transaction_date || new Date();
        transaction.quantity = data.quantity || 0;

        if (data.ticker_id) {
            transaction.ticker_id = data.ticker_id;
        }

        if (data.costs !== undefined) {
            transaction.costs = data.costs;
        }

        const updatedTransaction = await this.portfolioTransactionRepository.save(transaction);

        return updatedTransaction;
    }

    async deleteTransaction(id: string): Promise<any> {
        const transaction = await this.portfolioTransactionRepository.findOne({ where: { id } });
        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }

        return this.portfolioTransactionRepository.remove(transaction);
    }

    async getTransactions(portfolioId: string, individualTransactions: boolean, verbose: boolean = true): Promise<any[]> {
        const portfolioExists = await this.investmentPortfolioRepository.exists({ where: { id: portfolioId } });
        if (!portfolioExists) {
            throw new NotFoundException(`Portfolio with ID ${portfolioId} not found`);
        }

        const transactions = await this.portfolioTransactionRepository.find({
            where: { portfolio: { id: portfolioId } },
            relations: ['ticker', 'fixed_income_details'],
            select: {
                id: true,
                transaction_type: true,
                amount: true,
                price_per_unit: true,
                transaction_date: true,
                quantity: true,
                asset_type: true,
                created_at: true,
                ticker: {
                    id: true,
                    ticker: true,
                    asset_name: true,
                    asset_image_url: true,
                    current_price: true,
                    currency: true,
                    asset_type: true,
                    country: true,
                },
            },
        });

        if (individualTransactions) {
            // transactions.forEach((transaction) => {
            //     transaction.asset_type = this.languagesService.translateAssetType(
            //         transaction.ticker?.asset_type || transaction.asset_type,
            //         transaction.ticker?.currency || transaction.fixed_income_details?.currency || 'BRL'
            //     );
            // });

            transactions.sort((a, b) => {
                const dateA = new Date(a.created_at).getTime();
                const dateB = new Date(b.created_at).getTime();
                return dateB - dateA;
            });

            return transactions;
        }

        return this.consolidatePortfolio(transactions, verbose);
    }

    consolidatePortfolio(transactions: any[], verbose: boolean = true): any[] {
        const grouped: Record<string, any> = {};

        for (const transaction of transactions) {
            const isFixedIncome = transaction.fixed_income_details && !transaction.ticker;

            let assetId: string;
            let assetName: string;
            let assetType: string;
            let assetCurrency: string;
            let assetImageUrl: string;
            let currentPrice: number = 0;

            if (isFixedIncome) {
                assetId = `FI_${transaction.fixed_income_details.id}`;
                assetName = `${transaction.fixed_income_details.issuer} - ${transaction.fixed_income_details.investment_type}`;
                assetType = transaction.asset_type;
                assetCurrency = transaction.fixed_income_details.currency || 'BRL';
                assetImageUrl = 'https://investidor10.com.br/assets/front/images/money-check-alt.svg';
            } else {
                assetId = transaction.ticker?.ticker || 'TEMP';
                assetName = transaction.ticker?.asset_name || 'N/A';
                assetType = transaction.ticker?.asset_type || transaction.asset_type || 'N/A';
                assetCurrency = transaction.ticker?.currency || 'BRL';
                assetImageUrl = transaction.ticker?.asset_image_url || 'N/A';
                currentPrice = transaction.ticker ? parseFloat(transaction.ticker.current_price) : 0;
            }

            const amount = parseFloat(transaction.amount);
            const quantity = parseFloat(transaction.quantity);

            if (!grouped[assetId]) {
                grouped[assetId] = {
                    transaction_id: transaction.id,
                    ticker: isFixedIncome ? null : assetId,
                    fixed_income_details: isFixedIncome ? transaction.fixed_income_details : null,
                    asset_name: assetName,
                    asset_image_url: assetImageUrl,
                    asset_type: assetType,
                    currency: assetCurrency,
                    total_amount: 0,
                    total_quantity: 0,
                    quantity,
                    current_price: currentPrice,
                };
            }

            const asset = grouped[assetId];

            if (transaction.transaction_type === 'BUY') {
                asset.total_amount += amount;
                asset.total_quantity += quantity;
            }

            if (transaction.transaction_type === 'SELL') {
                const sellQuantity = Math.min(quantity, asset.total_quantity);
                const averagePrice =
                    asset.total_quantity > 0 ? asset.total_amount / asset.total_quantity : 0;
                const amountToReduce = sellQuantity * averagePrice;

                asset.total_quantity -= sellQuantity;
                asset.total_amount -= amountToReduce;

                if (asset.total_quantity < 0) asset.total_quantity = 0;
                if (asset.total_amount < 0) asset.total_amount = 0;
            }
        }

        const consolidatedPortfolio = Object.values(grouped)
            .filter((asset) => asset.total_amount > 0)
            .map((asset) => {
                const isFixedIncome = asset.fixed_income_details && !asset.ticker;
                const averagePrice = isFixedIncome ?
                    asset.total_amount :
                    (asset.total_quantity > 0 ? asset.total_amount / asset.total_quantity : 0);

                const currentValue = isFixedIncome ?
                    asset.total_amount * 1.06 : //CRIAR LOGICA PARA PUXAR RENTABILIDADE DA RENDA FIXA
                    asset.total_quantity * asset.current_price;

                const profit = currentValue - asset.total_amount;
                const variation = isFixedIncome ?
                    ((currentValue - asset.total_amount) / asset.total_amount) * 100 :
                    (averagePrice > 0 ? ((asset.current_price - averagePrice) / averagePrice) * 100 : 0);

                return {
                    ...asset,
                    average_price: isFixedIncome ? null : averagePrice.toFixed(2),
                    total_quantity: asset.total_quantity,
                    current_value: currentValue.toFixed(2),
                    profit: profit.toFixed(2),
                    variation: variation.toFixed(2),
                };
            });

        const totalPortfolioValue = consolidatedPortfolio.reduce((acc, asset) => acc + parseFloat(asset.current_value), 0);

        const groupedByCategory: Record<string, any[]> = {};

        for (const asset of consolidatedPortfolio) {
            const percentage =
                totalPortfolioValue > 0
                    ? ((parseFloat(asset.current_value) / totalPortfolioValue) * 100).toFixed(2)
                    : '0.00';

            const categoryName = this.languagesService.translateAssetType(asset.asset_type, asset.currency);

            if (!groupedByCategory[categoryName]) {
                groupedByCategory[categoryName] = [];
            }

            groupedByCategory[categoryName].push({
                ...asset,
                percentage,
                category_name: categoryName,
            });
        }

        if (verbose) {
            return Object.entries(groupedByCategory).map(([category, assets]) => {
                return {
                    category,
                    assets,
                }
            });
        }

        return Object.entries(groupedByCategory).map(([category, assets]) => {
            const totalPercentage = assets.reduce(
                (acc, asset) => acc + parseFloat(asset.percentage),
                0
            );

            return {
                category,
                total_percentage: totalPercentage.toFixed(2),
            };
        });
    }

    getPrompt(name: string): string | null {
        return this.prompts[name] || null;
    }

    async processWalletImport(files: Multer.File[]): Promise<any> {
        try {
            const filesContent = await Promise.all(
                files.map(async (file) => {
                    const fileExtension = path.extname(file.originalname).toLowerCase();

                    if (['.jpg', '.jpeg', '.png'].includes(fileExtension)) {
                        return this.processImageFile(file);
                    } else if (fileExtension === '.csv') {
                        return this.processCsvFile(file);
                    } else if (['.xlsx', '.xls'].includes(fileExtension)) {
                        return this.processExcelFile(file);
                    } else {
                        return {
                            filename: file.originalname,
                            error: 'Formato de arquivo não suportado',
                        };
                    }
                })
            );

            const validContents = filesContent.filter(content => !content.error);

            if (validContents.length === 0) {
                return {
                    success: false,
                    message: 'Nenhum arquivo válido para processamento',
                    errors: filesContent.map(f => f.error ? `${f.filename}: ${f.error}` : null).filter(Boolean)
                };
            }

            const response = await this.openai.chat.completions.create({
                model: process.env.OPEN_AI_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: this.getPrompt("wallet_import")
                    },
                    {
                        role: 'user',
                        content: [
                            ...validContents.map(content => {
                                if (content.type === 'image') {
                                    return {
                                        type: "image_url",
                                        image_url: {
                                            url: `data:${content.mimeType};base64,${content.data}`
                                        }
                                    } as const;
                                } else {
                                    return {
                                        type: "text",
                                        text: `Arquivo: ${content.filename}\n\nDados:\n${typeof content.data === 'string' ? content.data : JSON.stringify(content.data, null, 2)}`
                                    } as const;
                                }
                            })
                        ]
                    }
                ],
                max_tokens: 4000,
                response_format: { "type": "json_object" },
                temperature: 0.5,
            });

            const aiResponse = JSON.parse(response.choices[0].message?.content || '{}');

            //estrutura de erro { success: false, message: 'Erro' }

            try {
                const parsedResponse = JSON.parse(aiResponse);

                return parsedResponse;
            } catch (e) {
                return aiResponse;
            }
        } catch (error) {
            console.error('Erro ao processar importação:', error);
            return {
                success: false,
                message: 'Falha ao processar importação',
                error: error.message
            };
        }
    }

    private async processImageFile(file: Multer.File) {
        const base64Data = file.buffer.toString('base64');
        return {
            filename: file.originalname,
            type: 'image',
            mimeType: file.mimetype,
            data: base64Data
        };
    }

    private async processCsvFile(file: Multer.File): Promise<any> {
        return new Promise((resolve, reject) => {
            const results = [];
            const stream = require('stream');
            const bufferStream = new stream.PassThrough();
            bufferStream.end(file.buffer);

            bufferStream
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => {
                    resolve({
                        filename: file.originalname,
                        type: 'data',
                        data: results
                    });
                })
                .on('error', (error) => {
                    reject({
                        filename: file.originalname,
                        error: `Erro ao processar arquivo CSV: ${error.message}`
                    });
                });
        });
    }

    private async processExcelFile(file: Multer.File): Promise<any> {
        try {
            const workbook = xlsx.read(file.buffer, { type: 'buffer' });
            const results = {};

            workbook.SheetNames.forEach(sheetName => {
                const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
                results[sheetName] = sheetData;
            });

            return {
                filename: file.originalname,
                type: 'data',
                data: results
            };
        } catch (error) {
            return {
                filename: file.originalname,
                error: `Erro ao processar arquivo Excel: ${error.message}`
            };
        }
    }
}
