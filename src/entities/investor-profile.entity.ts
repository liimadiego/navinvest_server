import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';

export type InvestorProfileType = 'Conservador' | 'Moderado' | 'Agressivo';

@Entity('investor_profiles')
export class InvestorProfileEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => UserEntity, (user) => user.investorProfiles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;

    @Column({ type: 'char', length: 1 })
    experience: 'A' | 'B' | 'C';

    @Column({ type: 'char', length: 1 })
    risk_tolerance: 'A' | 'B' | 'C';

    @Column({ type: 'char', length: 1 })
    investment_horizon: 'A' | 'B' | 'C';

    @Column({ type: 'char', length: 1 })
    market_reaction: 'A' | 'B' | 'C';

    @Column({ type: 'char', length: 1 })
    investment_goal: 'A' | 'B' | 'C';

    @Column({ type: 'varchar', length: 20 })
    profile: InvestorProfileType;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
}
