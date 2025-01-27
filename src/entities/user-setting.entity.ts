import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('user_settings')
export class UserSettingsEntity {
    @PrimaryGeneratedColumn('uuid')
    userId: string;

    @OneToOne(() => UserEntity, (user) => user.settings, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;

    @Column({ type: 'boolean', default: true })
    receiveEmails: boolean;

    @Column({ type: 'boolean', default: false })
    darkMode: boolean;

    @Column({ type: 'varchar', length: 10, default: 'en' })
    language: string;
}
