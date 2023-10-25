import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { BotEntity } from '../BotEntity.js';

@Entity()
export class Permissions extends BotEntity {
  @PrimaryColumn({ generated: 'uuid' })
    id: string;

  @Column()
    name: string;

  @Column()
    order: number;

  @Column()
    isCorePermission:   boolean;

  @Column()
    isWaterfallAllowed: boolean;

  @Column({ type: 'varchar', length: 12 })
    automation: string;

  @Column({ type: 'simple-array' })
    userIds:            string[];
  @Column({ type: 'simple-array' })
    excludeUserIds:     string[];

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    filters: {
    comparator: '<' | '>' | '==' | '<=' | '>=';
    type: 'level' | 'ranks' | 'points' | 'watched' | 'tips' | 'bits' | 'messages' | 'subtier' | 'subcumulativemonths' | 'substreakmonths';
    value: string;
  }[];
}

@Entity()
export class PermissionCommands extends BotEntity{
  @PrimaryColumn({ generated: 'uuid' })
    id: string;

  @Column()
  @Index('IDX_ba6483f5c5882fa15299f22c0a')
    name: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
    permission: string | null;
}