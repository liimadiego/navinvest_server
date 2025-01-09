import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_settings')
export class UserSettings {
    @PrimaryGeneratedColumn('uuid')
    userId: string;

    @OneToOne(() => User, (user) => user.settings, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'boolean', default: true })
    receiveEmails: boolean;

    @Column({ type: 'boolean', default: false })
    darkMode: boolean;

    @Column({ type: 'varchar', length: 10, default: 'en' })
    language: string;
}
