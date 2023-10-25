import { BeforeInsert, BeforeUpdate, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { BotEntity } from '../BotEntity.js';
import { IsNotEmpty, MinLength } from 'class-validator';

import { ColumnNumericTransformer } from './_transformer.js';

@Entity()
@Index('IDX_301758e0e3108fc902d5436527', ['game'], { unique: true })
export class HowLongToBeatGame extends BotEntity {
  @PrimaryColumn({ generated: 'uuid', type: 'uuid' })
    id: string;

  @Column()
  @MinLength(2)
  @IsNotEmpty()
    game: string;

  @Column({ nullable: false, type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length })
    startedAt?: string;

  @BeforeInsert()
  generateStartedAt() {
    this.startedAt = new Date().toISOString();
  }

  @Column({ nullable: false, type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length })
    updatedAt?: string;

  @BeforeInsert()
  @BeforeUpdate()
  generateUpdatedAt() {
    this.updatedAt = new Date().toISOString();
  }

  @Column({ type: 'float', default: 0, precision: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 12 : undefined })
    gameplayMain: number;

  @Column({ type: 'float', default: 0, precision: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 12 : undefined })
    gameplayMainExtra: number;

  @Column({ type: 'float', default: 0, precision: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 12 : undefined })
    gameplayCompletionist: number;

  @Column({ type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0 })
    offset: number;

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    streams: {
    createdAt: string;
    timestamp: number;
    offset: number;
    isMainCounted: boolean;
    isCompletionistCounted: boolean;
    isExtraCounted: boolean;
  }[] = [];
}