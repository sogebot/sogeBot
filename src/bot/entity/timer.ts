import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class Timer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column()
  name!: string;
  @Column()
  isEnabled!: boolean;
  @Column()
  triggerEveryMessage!: number;
  @Column()
  triggerEverySecond!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  triggeredAtTimestamp!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  triggeredAtMessages!: number;
  @OneToMany(() => TimerResponse, (response) => response.timer, {
    cascade: true,
  })
  messages!: TimerResponse[];
}

@Entity()
export class TimerResponse {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  timestamp!: number;
  @Column({ default: true })
  isEnabled!: boolean;
  @Column('text')
  response!: string;
  @ManyToOne(() => Timer, (timer) => timer.messages, {
    onDelete: 'CASCADE',
  })
  timer!: Timer;
}