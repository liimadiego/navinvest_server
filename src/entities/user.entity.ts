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
    fullName: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    email: string;

    @Column({ type: 'varchar', length: 255 })
    passwordHash: string;

    @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
    phoneNumber?: string;

    @Column({ type: 'varchar', length: 50, default: 'user' })
    role: string;

    @Column({ type: 'varchar', length: 20, default: 'active' })
    status: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    @OneToOne(() => UserProfileEntity, (profile) => profile.user, { cascade: true })
    profile: UserProfileEntity;

    @OneToOne(() => UserSettingsEntity, (settings) => settings.user, { cascade: true })
    settings: UserSettingsEntity;

    @OneToMany(() => InvestmentPortfolioEntity, (portfolio) => portfolio.user, { cascade: true })
    portfolios: InvestmentPortfolioEntity[];

    @OneToMany(() => InvestorProfileEntity, (profile) => profile.user, { cascade: true })
    investorProfiles: InvestorProfileEntity[];
}
