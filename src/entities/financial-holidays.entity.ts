import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('financial_holidays')
@Unique(['date', 'name'])
export class FinancialHolidaysEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    date: Date;

    @Column()
    name: string;

    @Column()
    type: string;
}