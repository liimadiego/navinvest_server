import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { UserEntity } from './user.entity';
import { PortfolioTransactionEntity } from './portfolio-transaction.entity';

@Entity('investment_portfolios')
export class InvestmentPortfolioEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => UserEntity, (user) => user.portfolios, { onDelete: 'CASCADE' })
    user: UserEntity;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    updated_at: Date;

    @OneToMany(() => PortfolioTransactionEntity, (transaction) => transaction.portfolio, { cascade: true })
    transactions: PortfolioTransactionEntity[];
}
