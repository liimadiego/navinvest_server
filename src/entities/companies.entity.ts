import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TickersEntity } from './tickers.entity';

@Entity('companies')
export class CompanyEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text', nullable: true })
    about: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    b3_issuer_code: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    b3_listing_segment: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    b3_sector: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    b3_segment: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    b3_subsector: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    b3_trade_name: string;

    @Column({ type: 'varchar', length: 18, nullable: true })
    cnpj: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    controlling_interest: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    cvm_code: string;

    @Column({ type: 'date', nullable: true })
    founding_date: Date;

    @Column({ type: 'boolean', default: false })
    is_b3_listed: boolean;

    @Column({ type: 'boolean', default: false })
    is_foreign: boolean;

    @Column({ type: 'boolean', default: false })
    is_state_owned: boolean;

    @Column({ type: 'text', nullable: true })
    main_activity: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    trade_name: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    website: string;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;

    @OneToMany(() => TickersEntity, (ticker) => ticker.company)
    tickers: TickersEntity[];
}
