import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { z } from 'zod';

import { BotEntity } from '../BotEntity.js';

@Entity()
export class Cooldown extends BotEntity {
  _schema = z.object({
    name: z.string().min(2),
  });

  @PrimaryColumn({ generated: 'uuid', type: 'uuid' })
    id: string;

  @Column()
  @Index('IDX_aa85aa267ec6eaddf7f93e3665', { unique: true })
    name: string;

  @Column()
    miliseconds: number;

  @Column({ type: 'varchar', length: 10 })
    type: 'global' | 'user';

  @Column({ type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length })
    timestamp: string;

  @Column()
    isEnabled: boolean;

  @Column()
    isErrorMsgQuiet: boolean;

  @Column()
    isOwnerAffected: boolean;

  @Column()
    isModeratorAffected: boolean;

  @Column()
    isSubscriberAffected: boolean;
}