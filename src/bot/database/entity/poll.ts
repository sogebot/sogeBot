import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class Poll {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column('varchar', { length: 6 })
  type!: 'tips' | 'bits' | 'normal';
  @Column()
  title!: string;
  @Column()
  isOpened!: boolean;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  openedAt!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  closedAt!: number;
  @Column('simple-array')
  options!: string[];
  @OneToMany(() => PollVote, (opts) => opts.poll, {
    cascade: true,
  })
  votes!: PollVote[];
};

@Entity()
export class PollVote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @ManyToOne(() => Poll, (poll) => poll.votes, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  poll!: Poll;
  @Column()
  option!: number;
  @Column()
  votes!: number;
  @Column()
  votedBy!: string;
}