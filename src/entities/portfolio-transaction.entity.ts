import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { InvestmentPortfolioEntity } from './investment-portfolio.entity';
import { TickersEntity } from './tickers.entity';

@Entity('portfolio_transactions')
export class PortfolioTransactionEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => InvestmentPortfolioEntity, (portfolio) => portfolio.transactions, { onDelete: 'CASCADE' })
    portfolio: InvestmentPortfolioEntity;

    @ManyToOne(() => TickersEntity, (ticker) => ticker.transactions, { onDelete: 'CASCADE' })
    ticker: TickersEntity;

    @Column({ type: 'varchar', length: 20 })
    transactionType: string;

    @Column({ type: 'numeric', precision: 18, scale: 2 })
    amount: number;

    @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
    pricePerUnit?: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    transactionDate: Date;

    @Column({ type: 'varchar', length: 50 })
    objective:
        | 'Dividendos'
        | 'Longo Prazo'
        | 'Aposentadoria'
        | 'Valorização de Capital'
        | 'Renda Passiva'
        | 'Especulação'
        | 'Proteção Patrimonial'
        | 'Diversificação Global';
}
