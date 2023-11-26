import { BaseEntity, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { z } from 'zod';

import { command } from '../validators/IsCommand.js';
import { commandOrCustomVariable } from '../validators/IsCommandOrCustomVariable.js';
import { BotEntity } from '../BotEntity.js';

@Entity()
export class Alias extends BotEntity {
  schema = z.object({
    alias:   command(),
    command: commandOrCustomVariable(),
  });

  @PrimaryColumn({ generated: 'uuid' })
    id: string;

  @Column()
  @Index('IDX_6a8a594f0a5546f8082b0c405c')
    alias: string;

  @Column({ type: 'text' })
    command: string;

  @Column()
    enabled: boolean;

  @Column()
    visible: boolean;

  @Column({ nullable: true, type: String })
    permission: string | null;

  @Column({ nullable: true, type: String })
    group: string | null;
}

@Entity()
export class AliasGroup extends BaseEntity {
  @PrimaryColumn()
  @Index('IDX_alias_group_unique_name', { unique: true })
    name: string;

  @Column({ type: 'simple-json' })
    options: {
    filter: string | null;
    permission: string | null;
  };
}