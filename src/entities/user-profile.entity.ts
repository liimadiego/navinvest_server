import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_profiles')
export class UserProfile {
    @PrimaryGeneratedColumn('uuid')
    userId: string;

    @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'date', nullable: true })
    dateOfBirth?: Date;

    @Column({ type: 'text', nullable: true })
    address?: string;

    @Column({ type: 'text', nullable: true })
    profilePicture?: string;

    @Column({ type: 'text', nullable: true })
    bio?: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    riskTolerance?: string;
}
