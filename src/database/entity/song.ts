import { BeforeInsert, Column, Entity, PrimaryColumn } from 'typeorm';
import { BotEntity } from '../BotEntity.js';

export type currentSongType = {
  videoId: null | string, title: string, type: string, username: string, volume: number; loudness: number; forceVolume: boolean; startTime: number; endTime: number;
};

@Entity()
export class SongBan extends BotEntity {
  @PrimaryColumn()
    videoId: string;

  @Column()
    title: string;
}

@Entity()
export class SongPlaylist extends BotEntity {
  @PrimaryColumn()
    videoId: string;

  @Column({ type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length, default: '1970-01-01T00:00:00.000Z' })
    lastPlayedAt?: string;

  @Column()
    title: string;

  @Column({ type: 'float', precision: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 12 : undefined  })
    seed: number;

  @Column({ type: 'float', precision: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 12 : undefined  })
    loudness: number;

  @Column({ type: 'simple-array' })
    tags: string[];

  @Column()
    length: number;

  @Column()
    volume: number;

  @Column()
    startTime: number;

  @Column()
    endTime: number;

  @Column({ type: Boolean, default: false })
    forceVolume: boolean;
}

@Entity()
export class SongRequest extends BotEntity {
  @PrimaryColumn({ generated: 'uuid' })
    id: string;

  @Column()
    videoId: string;

  @Column({ type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length })
    addedAt?: string;

  @BeforeInsert()
  generateAddedAt() {
    this.addedAt = new Date().toISOString();
  }

  @Column()
    title: string;
  @Column({ type: 'float', precision: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 12 : undefined  })
    loudness: number;
  @Column()
    length: number;
  @Column()
    username: string;
}