import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, Index, JoinColumn, OneToOne } from 'typeorm';
import { InvestmentPortfolioEntity } from './investment-portfolio.entity';
import { TickersEntity } from './tickers.entity';
import { FixedIncomeDetailsEntity } from './fixed-income-details.entity';
import { TreasuriesEntity } from './treasuries.entity';
import { FundsEntity } from './funds.entity';

@Entity('portfolio_transactions')
export class PortfolioTransactionEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    portfolio_id: string;

    @Column({ type: 'numeric', nullable: true })
    ticker_id: number | null;

    @ManyToOne(() => InvestmentPortfolioEntity, (portfolio) => portfolio.transactions, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'portfolio_id' })
    portfolio: InvestmentPortfolioEntity;

    @ManyToOne(() => TickersEntity, (ticker) => ticker.transactions)
    @JoinColumn({ name: 'ticker_id' })
    ticker: TickersEntity;

    @OneToOne(() => FixedIncomeDetailsEntity, (fixed_income_details) => fixed_income_details.transactions, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'fixed_income_details_id' })
    fixed_income_details: FixedIncomeDetailsEntity;

    @OneToOne(() => TreasuriesEntity, (treasury) => treasury.transactions)
    @JoinColumn({ name: 'treasury_id' })
    treasury: TreasuriesEntity;

    @OneToOne(() => FundsEntity, (fund) => fund.transactions)
    @JoinColumn({ name: 'fund_id' })
    fund: FundsEntity;

    @Column({ type: 'varchar', length: 20 })
    transaction_type: string;

    @Column({ type: 'numeric', precision: 18, scale: 2 })
    amount: number;

    @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
    price_per_unit?: number;

    @Column({ type: 'numeric', precision: 18, scale: 8, nullable: true })
    quantity: number;

    @Column({ type: 'enum', enum: ['FII', 'STOCK', 'REIT', 'ETF', 'MUTUAL_FUND', 'FIXED_INCOME', 'TREASURY', 'CRYPTO', 'BDR'] })
    asset_type: string;

    @Index()
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    transaction_date: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;
}

