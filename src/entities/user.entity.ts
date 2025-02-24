import { Entity, Column, PrimaryGeneratedColumn, OneToOne, OneToMany } from 'typeorm';
import { UserProfileEntity } from './user-profile.entity';
import { UserSettingsEntity } from './user-setting.entity';
import { InvestorProfileEntity } from './investor-profile.entity';
import { InvestmentPortfolioEntity } from './investment-portfolio.entity';

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
}
