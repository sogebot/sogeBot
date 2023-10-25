import { BotEntity } from '../BotEntity.js';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class SpotifySongBan extends BotEntity<SpotifySongBan> {
  @PrimaryColumn()
    spotifyUri: string;
  @Column()
    title: string;
  @Column({ type: 'simple-array' })
    artists: string[];
}