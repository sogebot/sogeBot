import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class CacheEmotes {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  code!: string;

  @Column('varchar', { length: 6 })
  type!: 'twitch' | 'ffz' | 'bttv';

  @Column({ type: 'simple-json' })
  urls!: { '1': string; '2': string; '3': string };
}