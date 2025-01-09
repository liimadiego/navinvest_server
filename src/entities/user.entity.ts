import { Entity, Column, PrimaryGeneratedColumn, OneToOne, OneToMany } from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { UserSettings } from './user-setting.entity';
import { InvestmentPortfolio } from './investment-portfolio.entity';

@Entity('users')
export class User {
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

    @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
    profile: UserProfile;

    @OneToOne(() => UserSettings, (settings) => settings.user, { cascade: true })
    settings: UserSettings;

    @OneToMany(() => InvestmentPortfolio, (portfolio) => portfolio.user, { cascade: true })
    portfolios: InvestmentPortfolio[];
}
