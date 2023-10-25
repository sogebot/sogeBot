import { BeforeInsert, Column, Entity, PrimaryColumn } from 'typeorm';
import { BotEntity } from '../BotEntity.js';

@Entity()
export class Highlight extends BotEntity {
  @PrimaryColumn({ generated: 'uuid', type: 'uuid' })
    id: string;

  @Column()
    videoId: string;

  @Column()
    game: string;

  @Column()
    title: string;

  @Column({ default: false })
    expired: boolean;

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    timestamp: {
    hours: number; minutes: number; seconds: number;
  };

  @Column({ nullable: false, type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length })
    createdAt?: string;

  @BeforeInsert()
  generateCreatedAt() {
    this.createdAt = new Date().toISOString();
  }
}