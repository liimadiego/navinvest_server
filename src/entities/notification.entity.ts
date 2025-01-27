import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('notifications')
export class NotificationEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => UserEntity, (user) => user.id, { onDelete: 'CASCADE' })
    user: UserEntity;

    @Column('text')
    message: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ default: false })
    isRead: boolean;

    @Column({ default: false })
    sentEmail: boolean;

    @Column({ default: false })
    sentWpp: boolean;
}
