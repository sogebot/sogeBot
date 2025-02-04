import { Column, Entity, PrimaryColumn } from 'typeorm';

import { BotEntity } from '../BotEntity.js';

@Entity()
export class SpotifySongBan extends BotEntity {
  @PrimaryColumn()
  spotifyUri: string;
  @Column()
  title: string;
  @Column({ type: 'simple-array' })
  artists: string[];
}