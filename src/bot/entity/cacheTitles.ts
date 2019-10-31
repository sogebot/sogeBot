import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class CacheTitles {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  game!: string;

  @Column()
  title!: string;

  @Column()
  timestamp!: number;
}