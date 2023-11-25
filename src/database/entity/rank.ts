import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { z } from 'zod';

import { BotEntity } from '../BotEntity.js';

@Entity()
@Index('IDX_93c78c94804a13befdace81904', ['type', 'value'], { unique: true })
export class Rank extends BotEntity {
  schema = z.object({
    value: z.number().min(0),
    rank:  z.string().min(2),
  });

  @PrimaryColumn({ generated: 'uuid' })
    id: string;

  @Column()
    value: number;

  @Column()
    rank: string;

  @Column()
    type: 'viewer' | 'subscriber';
}