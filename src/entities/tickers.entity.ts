import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { TagEntity } from './tag.entity';
import { PortfolioTransactionEntity } from './portfolio-transaction.entity';
@Entity('tickers')
export class TickersEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToMany(() => TagEntity, (tag) => tag.tickers)
    @JoinTable({
        name: 'ticker_tags',
        joinColumn: { name: 'ticker_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
    })
    tags: TagEntity[];

    @OneToMany(() => PortfolioTransactionEntity, (transaction) => transaction.ticker)
    transactions: PortfolioTransactionEntity[];

    @Column({ length: 10, unique: true })
    ticker: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    latest_search_news: Date;


}