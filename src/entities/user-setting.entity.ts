import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('user_settings')
export class UserSettingsEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => UserEntity, (user) => user.settings, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;

    @Column({ type: 'boolean', default: true })
    receive_emails: boolean;

    @Column({ type: 'boolean', default: false })
    dark_mode: boolean;

    @Column({ type: 'varchar', length: 10, default: 'en' })
    language: string;
}
