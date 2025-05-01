import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('reits')
export class ReitEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text', nullable: true })
    about: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    b3IssuerCode: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    b3Sector: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    b3Segment: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    b3Subsector: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    b3TradeName: string;

    @Column({ type: 'varchar', length: 18, unique: true, nullable: false })
    cnpj: string;

    @Column({ type: 'date', nullable: true })
    foundingDate: Date;

    @Column({ type: 'boolean', default: false })
    isB3Listed: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    tradeName: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    website: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;
}
