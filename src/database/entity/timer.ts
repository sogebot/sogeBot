import { BaseEntity, ManyToOne, OneToMany } from 'typeorm';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { z } from 'zod';

import { BotEntity } from '../BotEntity.js';

@Entity()
export class Timer extends BotEntity {
  _schema = z.object({
    name:                z.string().min(2).regex(/^[a-zA-Z0-9_]*$/),
    triggerEveryMessage: z.number().min(0),
    triggerEverySecond:  z.number().min(0),
  });

  @PrimaryColumn({ generated: 'uuid', type: 'uuid' })
    id: string;

  @Column()
    name: string = '';

  @Column()
    isEnabled: boolean = true;

  @Column({ default: false })
    tickOffline: boolean = false;

  @Column()
    triggerEveryMessage: number = 30;

  @Column()
    triggerEverySecond: number = 60;

  @Column({ type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length, default: '1970-01-01T00:00:00.000Z' })
    triggeredAtTimestamp?: string;

  @Column({ default: 0 })
    triggeredAtMessages?: number;

  @OneToMany(() => TimerResponse, (item) => item.timer)
    messages: TimerResponse[];
}

@Entity()
export class TimerResponse extends BaseEntity {
  @PrimaryColumn({ generated: 'uuid', type: 'uuid' })
    id: string;

  @Column({ type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length, default: '1970-01-01T00:00:00.000Z' })
    timestamp: string;

  @Column({ default: true })
    isEnabled: boolean;

  @Column({ type: 'text' })
    response: string;

  @ManyToOne(() => Timer, (item) => item.messages, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    timer: Timer;
}