import { IsNotEmpty, MinLength } from 'class-validator';
import { BeforeInsert, Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { Alert } from './alert.js';
import { BotEntity } from '../BotEntity.js';
import { IsCommand } from '../validators/IsCommand.js';

@Entity()
@Index('idx_randomizer_cmdunique', [ 'command' ], { unique: true })
export class Randomizer extends BotEntity {
  @BeforeInsert()
  generateCreatedAt() {
    this.createdAt = new Date().toISOString();
  }

  @PrimaryColumn({ generated: 'uuid' })
    id: string;

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    items: {
    id: string;
    /*
     * This should hlp with grouping things like Bancrupcy, WIN, Bancrupcy, to always appear beside
     */
    groupId: string | null; // Will be used to group items together
    name: string;
    color: string;
    numOfDuplicates?: number; // number of duplicates
    minimalSpacing?: number; // minimal space between duplicates
    order: number;
  }[];

  @Column({ nullable: false, type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length })
    createdAt?: string;

  @Column()
  @IsNotEmpty()
  @MinLength(2)
  @IsCommand()
    command: string;

  @Column()
    permissionId: string;

  @Column()
  @IsNotEmpty()
  @MinLength(2)
    name: string;

  @Column({ type: Boolean, default: false })
    isShown?: boolean;

  @Column({ type: Boolean })
    shouldPlayTick: boolean;

  @Column()
    tickVolume: number;

  @Column()
    widgetOrder: number;

  @Column({
    type: 'varchar', length: 20, default: 'simple',
  })
    type: 'simple' | 'wheelOfFortune' | 'tape';

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    position: {
    x: number;
    y: number;
    anchorX: 'left' | 'middle' | 'right';
    anchorY: 'top' | 'middle' | 'bottom';
  };

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    customizationFont: {
    family: string;
    size: number;
    borderColor: string;
    borderPx: number;
    weight: number;
    shadow: {
      shiftRight: number;
      shiftDown: number;
      blur: number;
      opacity: number;
      color: string;
    }[];
  };

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    tts: Alert['tts'] & { enabled: boolean };
}