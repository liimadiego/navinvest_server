import { Injectable, NotFoundException } from '@nestjs/common';
import { TickersEntity } from 'entities/tickers.entity';
import { InvestmentPortfolioEntity } from '../entities/investment-portfolio.entity';
import { PortfolioTransactionEntity } from 'entities/portfolio-transaction.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePortfolioTransactionDto } from './dto/create-portfolio-transaction-dto';
import { LanguagesService } from 'utils/language.service';
import OpenAI from 'openai';
import * as path from 'path';
import * as csv from 'csv-parser';
import * as xlsx from 'xlsx';
import { ConfigService } from '@nestjs/config';
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
        private configService: ConfigService
    ) {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    async createTransactionFromWalletImportData(walletImportData: any, portfolioId: string): Promise<any> {
        const tickers = [];

        for (const transaction of walletImportData) {
            const ticker = await this.tickerRepository.findOne({ where: { ticker: transaction.ticker } });
            if (!ticker) {
                throw new NotFoundException(`Ticker ${transaction.ticker} not found`);
            }

            tickers.push({ tickerId: ticker.id, tickerName: transaction.ticker, ticker });
        }

        const portfolio = await this.investmentPortfolioRepository.findOne({ where: { id: portfolioId } });
        if (!portfolio) {
            throw new NotFoundException(`Portfolio with ID ${portfolioId} not found`);
        }

        for (const transaction of walletImportData) {
            const ticker = tickers.find(t => t.tickerName === transaction.ticker);

            if (!ticker) {
                throw new NotFoundException(`Ticker ${transaction.ticker} not found`);
            }

            const _transaction = this.portfolioTransactionRepository.create({
                portfolio: { id: portfolioId },
                ticker: { id: ticker.tickerId },
                transaction_type: transaction.transaction_type,
                amount: transaction.amount,
                price_per_unit: transaction.price_per_unit,
                transaction_date: transaction.transaction_date || new Date(),
                quantity: transaction.quantity
            });

            await this.portfolioTransactionRepository.save(_transaction);
        }

        return { success: true, message: 'Transactions created successfully' };

    }

    async createTransaction(createDto: CreatePortfolioTransactionDto): Promise<any> {
        const [portfolioExists, tickerExists] = await Promise.all([
            this.investmentPortfolioRepository.exist({ where: { id: createDto.portfolio_id } }),
            this.tickerRepository.exist({ where: { id: createDto.ticker_id } }),
        ]);

        if (!portfolioExists) {
            throw new NotFoundException(`Portfolio with ID ${createDto.portfolio_id} not found`);
        }

        if (!tickerExists) {
            throw new NotFoundException(`Ticker with ID ${createDto.ticker_id} not found`);
        }

        const transaction = this.portfolioTransactionRepository.create({
            portfolio: { id: createDto.portfolio_id },
            ticker: { id: createDto.ticker_id },
            transaction_type: createDto.transaction_type,
            amount: createDto.amount,
            price_per_unit: createDto.price_per_unit,
            transaction_date: createDto.transaction_date || new Date(),
            quantity: createDto.quantity
        });

        return this.portfolioTransactionRepository.save(transaction);
    }

    async editTransaction(data: any): Promise<any> {
        const transaction = await this.portfolioTransactionRepository.findOne({ where: { id: data.id } });
        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${data.id} not found`);
        }

        const updatedTransaction = this.portfolioTransactionRepository.merge(transaction, data);
        return this.portfolioTransactionRepository.save(updatedTransaction);
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
            relations: ['ticker'],
            select: {
                id: true,
                transaction_type: true,
                amount: true,
                price_per_unit: true,
                transaction_date: true,
                quantity: true,
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
            transactions.forEach((transaction) => {
                transaction.ticker.asset_type = this.languagesService.translateAssetType(
                    transaction.ticker.asset_type,
                    transaction.ticker.currency
                );
            });

            //mais recentes antes (transaction.transcation_date)
            transactions.sort((a, b) => {
                const dateA = new Date(a.transaction_date).getTime();
                const dateB = new Date(b.transaction_date).getTime();
                return dateB - dateA;
            });

            return transactions;
        }

        return this.consolidatePortfolio(transactions, verbose);
    }

    consolidatePortfolio(transactions: any[], verbose: boolean = true): any[] {
        const grouped: Record<string, any> = {};

        for (const transaction of transactions) {
            const tickerCode = transaction.ticker.ticker;
            const amount = parseFloat(transaction.amount);
            const quantity = parseFloat(transaction.quantity);

            if (!grouped[tickerCode]) {
                grouped[tickerCode] = {
                    transaction_id: transaction.id,
                    ticker: tickerCode,
                    asset_name: transaction.ticker.asset_name,
                    asset_image_url: transaction.ticker.asset_image_url,
                    asset_type: transaction.ticker.asset_type,
                    currency: transaction.ticker.currency,
                    total_amount: 0,
                    total_quantity: 0,
                    quantity,
                    current_price: parseFloat(transaction.ticker.current_price),
                };
            }

            const asset = grouped[tickerCode];

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
            .filter((asset) => asset.total_quantity > 0)
            .map((asset) => {
                const averagePrice =
                    asset.total_quantity > 0
                        ? asset.total_amount / asset.total_quantity
                        : 0;
                const currentValue = asset.total_quantity * asset.current_price;
                const profit = currentValue - asset.total_amount;
                const variation =
                    averagePrice > 0
                        ? ((asset.current_price - averagePrice) / averagePrice) * 100
                        : 0;

                return {
                    ...asset,
                    average_price: averagePrice.toFixed(2),
                    total_quantity: asset.total_quantity,
                    current_value: currentValue.toFixed(2),
                    profit: profit.toFixed(2),
                    variation: variation.toFixed(2),
                };
            });

        const totalPortfolioValue = consolidatedPortfolio.reduce(
            (acc, asset) => acc + parseFloat(asset.current_value),
            0
        );

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
                if (parsedResponse.success === false) {
                    return {
                        success: false,
                        message: parsedResponse.message || 'Erro ao processar resposta da IA',
                        error: parsedResponse.message || 'Erro ao processar resposta da IA',
                    };
                } else {
                    return {
                        success: true,
                        data: parsedResponse
                    };
                }
            } catch (e) {
                if (aiResponse.success === false) {
                    return {
                        success: false,
                        message: aiResponse.message || 'Erro ao processar resposta da IA',
                        error: aiResponse.message || 'Erro ao processar resposta da IA',
                    };
                }

                return {
                    success: true,
                    data: aiResponse
                };
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
