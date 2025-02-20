import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { TickersEntity } from './tickers.entity';

@Entity('tags')
export class TagEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    name: string;

    @Column({ type: 'varchar', length: 50 })
    description: string;

    @ManyToMany(() => TickersEntity, (ticker) => ticker.tags)
    tickers: TickersEntity[];
}
