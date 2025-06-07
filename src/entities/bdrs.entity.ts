import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TickersEntity } from './tickers.entity';

@Entity('bdrs')
export class BdrEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 10 })
    currency: string;

    @Column({ type: 'varchar', length: 100 })
    long_name: string;

    @Column({ type: 'varchar', length: 10, unique: true })
    symbol: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    address1: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    address2: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    city: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    zip: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    country: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    website: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    industry: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    sector: string;

    @Column({ type: 'text', nullable: true })
    about: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    logo_url: string;

    @OneToMany(() => TickersEntity, (ticker) => ticker.bdr)
    tickers: TickersEntity[];
}
