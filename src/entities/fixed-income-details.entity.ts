import { Entity, PrimaryGeneratedColumn, OneToMany, OneToOne, Column } from 'typeorm';
import { PortfolioTransactionEntity } from './portfolio-transaction.entity';

@Entity('fixed_income_details')
export class FixedIncomeDetailsEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => PortfolioTransactionEntity, (transaction) => transaction.fixed_income_details)
    transactions: PortfolioTransactionEntity[];

    @Column({ type: 'varchar', length: 150 })
    issuer: string;

    @Column({ type: 'enum', enum: ['LCI', 'CDB', 'LCA', 'LC', 'LF', 'RDB', 'DEBENTURE', 'CRI', 'CRA', 'CCB'] })
    investment_type: 'LCI' | 'CDB' | 'LCA' | 'LC' | 'LF' | 'RDB' | 'DEBENTURE' | 'CRI' | 'CRA' | 'CCB';

    @Column({ type: 'enum', enum: ['PRE_FIXED', 'POST_FIXED'] })
    indexation_type: 'PRE_FIXED' | 'POST_FIXED';

    @Column({ type: 'timestamp' })
    expiration_date: Date;

    @Column({ type: 'enum', enum: ['+', 'CDI', 'CDI+', 'IPCA+'] })
    indexer: '+' | 'CDI' | 'CDI+' | 'IPCA+';

    @Column({ type: 'enum', enum: ['BRL', 'USD'] })
    currency: 'BRL' | 'USD';

    @Column({ type: 'numeric', precision: 10, scale: 4 })
    indexer_rate: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    updated_at: Date;
}
