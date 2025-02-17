import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { TickersEntity } from './tickers.entity';

@Entity('user_tickers_subscribe')
export class UserTickersSubscribeEntity {
    @PrimaryColumn('uuid')
    user_id: string;

    @PrimaryColumn()
    ticker_id: number;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;

    @ManyToOne(() => TickersEntity)
    @JoinColumn({ name: 'ticker_id' })
    ticker: TickersEntity;
}