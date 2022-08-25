import { IsNotEmpty, MinLength } from 'class-validator';
import { ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Timer extends BaseEntity {
  @PrimaryColumn({ generated: 'uuid', type: 'uuid' })
    id: string;

  @Column()
  @IsNotEmpty()
  @MinLength(2)
    name: string;

  @Column()
    isEnabled: boolean;

  @Column({ default: false })
    tickOffline: boolean;

  @Column()
    triggerEveryMessage: number;

  @Column()
    triggerEverySecond: number;

  @Column({ default: '1970-01-01T00:00:00.000Z' })
    triggeredAtTimestamp?: string;

  @Column({ default: 0 })
    triggeredAtMessages?: number;

  @OneToMany(() => TimerResponse, (item) => item.timer)
    responses: TimerResponse[];
}

@Entity()
export class TimerResponse extends BaseEntity {
  @PrimaryColumn({ generated: 'uuid', type: 'uuid' })
    id: string;

  @Column({ default: '1970-01-01T00:00:00.000Z' })
    timestamp: string;

  @Column({ default: true })
    isEnabled: boolean;

  @Column({ type: 'text' })
    response: string;

  @ManyToOne(() => Timer, (item) => item.responses, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    timer: Timer;
}