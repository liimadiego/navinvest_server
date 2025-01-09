import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { PortfolioTransaction } from './portfolio-transaction.entity';

@Entity('investment_portfolios')
export class InvestmentPortfolio {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, (user) => user.portfolios, { onDelete: 'CASCADE' })
    user: User;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    @OneToMany(() => PortfolioTransaction, (transaction) => transaction.portfolio, { cascade: true })
    transactions: PortfolioTransaction[];
}
