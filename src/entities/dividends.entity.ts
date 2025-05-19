import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, ManyToMany } from 'typeorm';
import { CompanyEntity } from './companies.entity';
import { ReitEntity } from './reits.entity';
import { TickersEntity } from './tickers.entity';

@Entity('dividends')
export class DividendEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => CompanyEntity, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'company_id' })
    company: CompanyEntity;

    @ManyToOne(() => ReitEntity, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'reit_id' })
    reit: ReitEntity;

    @Column({ type: 'numeric', precision: 15, scale: 6, nullable: true })
    amount: number;

    @Column({ type: 'numeric', precision: 15, scale: 6, nullable: true })
    adj_amount: number;

    @Column({ type: 'date', nullable: true })
    approval_date: Date;

    @Column({ type: 'integer', nullable: true })
    cvm_code: number;

    @Column({ type: 'date', nullable: true })
    ex_date: Date;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ type: 'date', nullable: true })
    payable_date: Date;

    @Column({ type: 'date', nullable: true })
    record_date: Date;

    @Column({ type: 'varchar', length: 20, nullable: true })
    ticker: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    type: string;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;

    @ManyToOne(() => TickersEntity, (ticker) => ticker.dividends, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'ticker', referencedColumnName: 'ticker' })
    tickerInfo: TickersEntity;
}
