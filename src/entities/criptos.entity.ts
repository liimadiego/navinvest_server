import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TickersEntity } from './tickers.entity';

@Entity('criptos')
export class CriptoEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 10, unique: true })
    ticker: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'numeric', precision: 20, scale: 2, nullable: true })
    market_cap: number;

    @Column({ type: 'integer', nullable: true })
    market_cap_rank: number;

    @Column({ type: 'numeric', precision: 20, scale: 2, nullable: true })
    fully_diluted_valuation: number;

    @Column({ type: 'numeric', precision: 20, scale: 2, nullable: true })
    total_volume: number;

    @Column({ type: 'numeric', precision: 20, scale: 2, nullable: true })
    high_24h: number;

    @Column({ type: 'numeric', precision: 20, scale: 2, nullable: true })
    low_24h: number;

    @Column({ type: 'numeric', precision: 20, scale: 2, nullable: true })
    circulating_supply: number;

    @Column({ type: 'numeric', precision: 20, scale: 2, nullable: true })
    total_supply: number;

    @Column({ type: 'numeric', precision: 20, scale: 2, nullable: true })
    max_supply: number;

    @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
    roi_percentage: number;

    @Column({ type: 'varchar', length: 10, nullable: true })
    roi_currency: string;

    @CreateDateColumn({ type: 'timestamp' })
    last_updated: Date;

    @OneToMany(() => TickersEntity, (ticker) => ticker.cripto)
    tickers: TickersEntity[];
}
