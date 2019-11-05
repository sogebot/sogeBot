import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Highlight {
  @PrimaryGeneratedColumn()
  id!: string;
  @Column()
  videoId!: string;
  @Column()
  game!: string;
  @Column()
  title!: string;
  @Column('simple-json')
  timestamp!: {
    hours: number; minutes: number; seconds: number;
  };
  @Column('bigint')
  createdAt!: number;
}
