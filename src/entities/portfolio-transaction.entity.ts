import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { InvestmentPortfolioEntity } from './investment-portfolio.entity';

@Entity('portfolio_transactions')
export class PortfolioTransactionEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => InvestmentPortfolioEntity, (portfolio) => portfolio.transactions, { onDelete: 'CASCADE' })
    portfolio: InvestmentPortfolioEntity;

    @Column({ type: 'varchar', length: 20 })
    transactionType: string;

    @Column({ type: 'varchar', length: 50 })
    asset: string;

    @Column({ type: 'numeric', precision: 18, scale: 2 })
    amount: number;

    @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
    pricePerUnit?: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    transactionDate: Date;
}
