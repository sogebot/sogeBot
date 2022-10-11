import { ArrayMinSize, IsNotEmpty, MinLength } from 'class-validator';
import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';

@Entity()
export class Poll extends BaseEntity {
  @PrimaryColumn({ generated: 'uuid' })
    id: string;

  @Column({ type: 'varchar', length: 7 })
    type: 'tips' | 'bits' | 'normal' | 'numbers';

  @Column()
  @MinLength(2)
  @IsNotEmpty()
    title: string;

  @CreateDateColumn()
    openedAt: Date;

  @Column({ nullable: true, type: 'date' })
    closedAt: Date | null;

  @ArrayMinSize(2)
  @Column({ type: 'simple-array' })
    options: string[];

  @OneToMany(() => PollVote, (item) => item.poll)
    votes: PollVote[];

  static findOpened() {
    return this.findOne({ relations: ['votes'], where: { closedAt: null } });
  }
}

@Entity()
export class PollVote extends BaseEntity {
  @PrimaryColumn({ generated: 'uuid' })
    id: string;

  @Column()
    option: number;

  @Column()
    votes: number;

  @Column()
    votedBy: string;

  @ManyToOne(() => Poll, (item) => item.votes, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    poll: Poll;
}