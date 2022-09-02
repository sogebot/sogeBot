import { IsNotEmpty, MinLength, Matches, Min } from 'class-validator';
import { ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Timer extends BaseEntity {
  @PrimaryColumn({ generated: 'uuid', type: 'uuid' })
    id: string;

  @Column()
  @IsNotEmpty()
  @MinLength(2)
  @Matches(/^[a-zA-Z0-9_]*$/)
    name: string = '';

  @Column()
    isEnabled: boolean = true;

  @Column({ default: false })
    tickOffline: boolean = false;

  @Column()
  @Min(0)
    triggerEveryMessage: number = 30;

  @Column()
  @Min(0)
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