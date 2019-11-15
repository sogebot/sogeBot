import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity()
export class CacheGames {
  @PrimaryColumn()
  id!: number;

  @Column()
  @Index()
  name!: string;
}