import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TickersEntity } from './tickers.entity';

@Entity('reits')
export class ReitEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text', nullable: true })
    about: string;

    @Column({ type: 'varchar', length: 20, nullable: true, name: 'b3_issuer_code' })
    b3IssuerCode: string;

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'b3_sector' })
    b3Sector: string;

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'b3_segment' })
    b3Segment: string;

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'b3_subsector' })
    b3Subsector: string;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'b3_trade_name' })
    b3TradeName: string;

    @Column({ type: 'varchar', length: 18, unique: true, nullable: false })
    cnpj: string;

    @Column({ type: 'date', nullable: true, name: 'founding_date' })
    foundingDate: Date;

    @Column({ type: 'boolean', default: false, name: 'is_b3_listed' })
    isB3Listed: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'trade_name' })
    tradeName: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    website: string;

    @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
    updatedAt: Date;
    
    @OneToMany(() => TickersEntity, (ticker) => ticker.company)
    tickers: TickersEntity[];
}
