import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ThreadEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index()
  event!: string;
}