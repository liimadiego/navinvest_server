import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { PortfolioTransactionEntity } from './portfolio-transaction.entity';

@Entity('funds')
export class FundsEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => PortfolioTransactionEntity, (transaction) => transaction.fund)
    transactions: PortfolioTransactionEntity[];

    @Column({ type: 'timestamp', nullable: true })
    begin_date: Date;

    @Column({ type: 'varchar', length: 255, nullable: true })
    benchmark: string;

    @Column({ type: 'varchar', length: 20, unique: true })
    cnpj: string;

    @Column({ type: 'varchar', length: 20, unique: true })
    cvm_code: string;

    @Column({ type: 'numeric', nullable: true })
    current_price: number;

    @Column({ type: 'varchar', length: 50, nullable: true })
    fund_class: string;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    management_fee: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    management_fee_description: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    name: string;

    @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
    net_worth: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    performance_fee: number;

    @Column({ type: 'text', nullable: true })
    performance_fee_description: string;

    @Column({ type: 'integer', nullable: true })
    shareholders: number;

    @Column({ type: 'varchar', length: 255, unique: true })
    slug: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    trade_name: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    type: string;
}