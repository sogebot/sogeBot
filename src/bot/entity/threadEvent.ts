import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ThreadEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  event!: string;
}