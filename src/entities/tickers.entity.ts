import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    ManyToMany,
    JoinTable,
    OneToOne,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { TagEntity } from './tag.entity';
import { PortfolioTransactionEntity } from './portfolio-transaction.entity';
import { CompanyEntity } from './companies.entity';

@Entity('tickers')
export class TickersEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 10, unique: true })
    ticker: string;

    @Column()
    asset_name: string;

    // @Column({ nullable: true })
    // company_id: string;

    @Column({ nullable: true })
    asset_image_url: string;

    @Column({ nullable: true })
    latest_search_news: Date;

    @Column({ nullable: true })
    asset_type: string;

    @Column({ nullable: true })
    currency: string;

    @Column({ nullable: true })
    country: string;

    @Column({ nullable: true })
    exchange: string;

    @Column({ type: 'numeric', nullable: true })
    current_price: number;

    @Column({ nullable: true })
    risk_rating: string;

    @Column({ type: 'timestamp', default: () => 'now()' })
    updated_at: Date;

    @ManyToMany(() => TagEntity, (tag) => tag.tickers)
    @JoinTable({
        name: 'ticker_tags',
        joinColumn: { name: 'ticker_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
    })
    tags: TagEntity[];

    @OneToMany(() => PortfolioTransactionEntity, (transaction) => transaction.ticker)
    transactions: PortfolioTransactionEntity[];

    @ManyToOne(() => CompanyEntity, (company) => company.tickers)
    @JoinColumn({ name: 'company_id', referencedColumnName: 'id' })
    company: CompanyEntity;
}