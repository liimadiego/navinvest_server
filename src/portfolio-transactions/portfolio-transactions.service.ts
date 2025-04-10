import { Injectable, NotFoundException } from '@nestjs/common';
import { TickersEntity } from 'entities/tickers.entity';
import { InvestmentPortfolioEntity } from '../entities/investment-portfolio.entity';
import { PortfolioTransactionEntity } from 'entities/portfolio-transaction.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePortfolioTransactionDto } from './dto/create-portfolio-transaction-dto';

@Injectable()
export class PortfolioTransactionsService {
    constructor(
        @InjectRepository(InvestmentPortfolioEntity)
        private readonly investmentPortfolioRepository: Repository<InvestmentPortfolioEntity>,
        @InjectRepository(TickersEntity)
        private readonly tickerRepository: Repository<TickersEntity>,
        @InjectRepository(PortfolioTransactionEntity)
        private readonly portfolioTransactionRepository: Repository<PortfolioTransactionEntity>
    ) { }

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

    async getTransactions(portfolioId: string, individualTransactions: boolean): Promise<any[]> {
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
                transaction.ticker.asset_type = this.translateAssetType(
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

        return this.consolidatePortfolio(transactions);
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

    consolidatePortfolio(transactions: any[]): any[] {
        const grouped: Record<string, any> = {};

        for (const transaction of transactions) {
            const tickerCode = transaction.ticker.ticker;
            const amount = parseFloat(transaction.amount);
            const price = parseFloat(transaction.price_per_unit);
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

            const categoryName = this.translateAssetType(asset.asset_type, asset.currency);

            if (!groupedByCategory[categoryName]) {
                groupedByCategory[categoryName] = [];
            }

            groupedByCategory[categoryName].push({
                ...asset,
                percentage,
                category_name: categoryName,
            });
        }

        return Object.entries(groupedByCategory).map(([category, assets]) => ({
            category,
            assets,
        }));
    }

}
