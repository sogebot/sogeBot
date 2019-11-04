import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Checklist {
  @PrimaryGeneratedColumn()
  id!: string;
  @Column()
  isCompleted!: boolean;
  @Column()
  value!: string;
};