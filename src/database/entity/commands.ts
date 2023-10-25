import { IsNotEmpty, MinLength } from 'class-validator';
import { BaseEntity, Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { IsCommand } from '../validators/IsCommand.js';

@Entity()
export class Commands extends BaseEntity {
  @PrimaryColumn({ generated: 'uuid', type: 'uuid' })
    id: string;

  @Column()
  @IsNotEmpty()
  @MinLength(2)
  @IsCommand()
  @Index('IDX_1a8c40f0a581447776c325cb4f')
    command: string;

  @Column()
    enabled: boolean;

  @Column()
    visible: boolean;

  @Column({ nullable: true, type: String })
    group: string | null;

  @Column({ default: false })
    areResponsesRandomized: boolean;

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    responses: {
    id: string;
    order: number;
    response: string;
    stopIfExecuted: boolean;
    permission: string | null;
    filter: string;
  }[] = [];
}

@Entity()
export class CommandsGroup extends BaseEntity {
  @PrimaryColumn()
  @Index('IDX_commands_group_unique_name', { unique: true })
    name: string;

  @Column({ type: 'simple-json' })
    options: {
    filter: string | null;
    permission: string | null;
  };
}

@Entity()
export class CommandsCount extends BaseEntity {
  @PrimaryColumn({ generated: 'uuid', type: 'uuid' })
    id: string;

  @Index('IDX_2ccf816b1dd74e9a02845c4818')
  @Column()
    command: string;

  @Column({ type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length })
    timestamp: string;
}