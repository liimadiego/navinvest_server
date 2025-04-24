import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PortfolioTransactionEntity } from './portfolio-transaction.entity';

@Entity('treasuries')
export class TreasuriesEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'uuid', default: () => `'${uuidv4()}'` })
    uuid: string;

    @OneToOne(() => PortfolioTransactionEntity, (transaction) => transaction.fixed_income_details)
    transactions: PortfolioTransactionEntity[];

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'date', nullable: true })
    expiration_date: Date;

    @Column({ type: 'varchar', length: 255 })
    indexer: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    min_investment: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    unit_price: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    rate: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    isin: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;
}