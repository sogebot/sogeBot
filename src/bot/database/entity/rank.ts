import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Rank {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column()
  @Index({ unique: true })
  hours!: number;
  @Column()
  rank!: string;
};