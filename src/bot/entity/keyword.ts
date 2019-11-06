import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Keyword {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column()
  @Index()
  keyword!: string;
  @Column()
  response!: string;
  @Column()
  enabled!: boolean;
};