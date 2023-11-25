import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { z } from 'zod';

import { BotEntity } from '../BotEntity.js';
import { command } from '../validators/IsCommand.js';

@Entity()
export class Price extends BotEntity {
  schema = z.object({
    command:   command(),
    price:     z.number().min(0),
    priceBits: z.number().min(0),
  }).refine(data => data.price === 0 && data.priceBits === 0, {
    path: ['invalidPrice'], // we need to specify at least one price
  });

  @PrimaryColumn({ generated: 'uuid' })
    id: string;

  @Column()
  @Index('IDX_d12db23d28020784096bcb41a3', { unique: true })
    command: string;

  @Column({ default: true })
    enabled: boolean;

  @Column({ default: false })
    emitRedeemEvent: boolean;

  @Column()
    price: number;

  @Column({ default: 0 })
    priceBits: number;
}