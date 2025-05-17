import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity()
export class TokenUsageEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: string;

    @Column({ default: 0 })
    tokens_used: number;

    @ManyToOne(() => UserEntity, (user) => user.tokenUsages)
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;
}
