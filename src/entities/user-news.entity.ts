import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { UserEntity } from './user.entity';
import { NewsEntity } from './news.entity';

@Entity('user_news')
export class UserNewsEntity {
  @PrimaryColumn('uuid')
  user_id: string;

  @PrimaryColumn()
  news_id: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => NewsEntity)
  @JoinColumn({ name: 'news_id' })
  news: NewsEntity;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  sent_at: Date;
}