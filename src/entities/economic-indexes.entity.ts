import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('economic_indexes')
@Unique(['date', 'slug'])
export class EconomicIndexesEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    date: Date;

    @Column()
    slug: string;

    @Column({ type: 'numeric', precision: 5, scale: 2 })
    value: number;

    @Column()
    estimate: boolean;
}
