import { BaseEntity, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { z } from 'zod';

import { BotEntity } from '../BotEntity.js';

@Entity()
export class Keyword extends BotEntity {
  _schema = z.object({
    keyword: z.string().min(2),
  });

  @PrimaryColumn({ generated: 'uuid', type: 'uuid' })
  id: string;

  @Column()
  @Index('IDX_35e3ff88225eef1d85c951e229')
  keyword: string;

  @Column()
  enabled: boolean;

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
export class KeywordGroup extends BaseEntity {
  @PrimaryColumn()
  @Index('IDX_keyword_group_unique_name', { unique: true })
  name: string;

  @Column({ type: 'simple-json' })
  options: {
    filter: string | null;
    permission: string | null;
  };
}