import { Column, Entity, PrimaryColumn } from 'typeorm';
import { z } from 'zod';

import { BotEntity } from '../BotEntity.js';

@Entity()
export class Quotes extends BotEntity {
  schema = z.object({
    quote: z.string().min(1),
  });

  @PrimaryColumn({ type: 'int', generated: 'increment' })
    id: number;

  @Column({ type: 'simple-array' })
    tags: string[];

  @Column()
    quote: string;

  @Column()
    quotedBy: string;

  @Column({ type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length, default: '1970-01-01T00:00:00.000Z' })
    createdAt: string;
}