import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { z } from 'zod';

import { BotEntity } from '../BotEntity.js';
import { command } from '../validators/IsCommand.js';

@Entity()
export class Price extends BotEntity {
  schema = z.intersection(
    // we need to validate command separately as refine is not triggered until all other validation passes
    z.object({
      command: command(),
    }),
    z.object({
      price:     z.number().min(0),
      priceBits: z.number().min(0),
    }).refine(data => {
      return data.price > 0 || data.priceBits > 0;
    }, {
      path: ['invalidPrice'], // we need to specify at least one price
    }));

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