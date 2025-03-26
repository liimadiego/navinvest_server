import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, Index, JoinColumn } from 'typeorm';
import { InvestmentPortfolioEntity } from './investment-portfolio.entity';
import { TickersEntity } from './tickers.entity';

@Entity('portfolio_transactions')
export class PortfolioTransactionEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    portfolio_id: string;

    @Column({ type: 'numeric' })
    ticker_id: number;

    @ManyToOne(() => InvestmentPortfolioEntity, (portfolio) => portfolio.transactions, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'portfolio_id' })
    portfolio: InvestmentPortfolioEntity;

    @ManyToOne(() => TickersEntity, (ticker) => ticker.transactions, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'ticker_id' })
    ticker: TickersEntity;

    @Column({ type: 'varchar', length: 20 })
    transaction_type: string;

    @Column({ type: 'numeric', precision: 18, scale: 2 })
    amount: number;

    @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
    price_per_unit?: number;

    @Index()
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    transaction_date: Date;

    // Campos adicionais úteis
    // @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
    // fees?: number;

    // @Column({ type: 'text', nullable: true })
    // notes?: string;
}

