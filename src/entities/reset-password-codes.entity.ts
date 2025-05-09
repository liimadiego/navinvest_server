import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('reset_password_codes')
export class ResetPasswordCodeEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 6 })
    code: string;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    @Column({ name: 'user_id' })
    user_id: string;

    @Column({ type: 'boolean', default: false })
    used: boolean;

    @Column({ type: 'timestamp' })
    expires_at: Date;

    @ManyToOne(() => UserEntity, (user) => user.resetPasswordCodes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;
}