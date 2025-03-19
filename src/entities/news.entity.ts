import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TickersEntity } from './tickers.entity';
import { v4 as uuidv4 } from 'uuid';

@Entity('news')
export class NewsEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'uuid', default: () => `'${uuidv4()}'` })
    uuid: string;

    @ManyToOne(() => TickersEntity)
    @JoinColumn({ name: 'ticker_id' })
    ticker: TickersEntity;

    @Column()
    title: string;

    @Column({ nullable: true })
    description: string;

    @Column()
    content: string;

    @Column({ nullable: true })
    url: string;

    @Column({ nullable: true })
    image_url: string;

    @Column()
    source: string;

    @Column({ type: 'timestamp', nullable: true })
    published_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;
}