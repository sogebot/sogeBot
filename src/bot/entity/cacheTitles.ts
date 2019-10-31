import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class CacheTitles {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index()
  game!: string;

  @Column()
  title!: string;

  @Column()
  timestamp!: number;
}