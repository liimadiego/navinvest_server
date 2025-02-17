import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tickers')
export class TickersEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 10, unique: true })
    ticker: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    latest_search_news: Date;
}