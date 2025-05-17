import { Entity, Column, PrimaryGeneratedColumn, OneToOne, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { UserProfileEntity } from './user-profile.entity';
import { UserSettingsEntity } from './user-setting.entity';
import { InvestorProfileEntity } from './investor-profile.entity';
import { InvestmentPortfolioEntity } from './investment-portfolio.entity';
import { ResetPasswordCodeEntity } from './reset-password-codes.entity';
import { PlanEntity } from './plan.entity';
import { TokenUsageEntity } from './token-usage.entity';

@Entity('users')
export class UserEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    full_name: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    email: string;

    @Column({ type: 'varchar', length: 255 })
    password_hash: string;

    @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
    phone_number?: string;

    @Column({ type: 'varchar', length: 50, default: 'user' })
    role: string;

    @Column({ type: 'varchar', length: 20, default: 'active' })
    status: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    updated_at: Date;

    @OneToOne(() => UserProfileEntity, (profile) => profile.user, { cascade: true })
    profile: UserProfileEntity;

    @OneToOne(() => UserSettingsEntity, (settings) => settings.user, { cascade: true })
    settings: UserSettingsEntity;

    @OneToMany(() => InvestmentPortfolioEntity, (portfolio) => portfolio.user, { cascade: true })
    portfolios: InvestmentPortfolioEntity[];

    @OneToMany(() => InvestorProfileEntity, (profile) => profile.user, { cascade: true })
    investorProfiles: InvestorProfileEntity[];

    @OneToMany(() => ResetPasswordCodeEntity, (code) => code.user, { cascade: true })
    resetPasswordCodes: ResetPasswordCodeEntity[];

    @Column({ type: 'uuid', nullable: true })
    plan_id: string | null;

    @Column({ type: 'timestamp', nullable: true })
    plan_expiration: Date | null;

    @ManyToOne(() => PlanEntity, (plan) => plan.users, { nullable: true })
    @JoinColumn({ name: 'plan_id' })
    plan: PlanEntity;

    @OneToMany(() => TokenUsageEntity, (tokenUsage) => tokenUsage.user, { cascade: true })
    tokenUsages: TokenUsageEntity[];
}
