import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TickersEntity } from './tickers.entity';

@Entity('stocks')
export class StockEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 20, unique: true })
    symbol: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'varchar', length: 40, nullable: true })
    cik: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    country: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    sector: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    industry: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    official_site: string;

    @Column({ type: 'varchar', length: 10, nullable: true })
    fiscal_year_end: string;

    @Column({ type: 'date', nullable: true })
    latest_quarter: Date;

    @Column({ type: 'numeric', nullable: true })
    market_capitalization: number;

    @OneToMany(() => TickersEntity, (ticker) => ticker.stock)
    tickers: TickersEntity[];
}
