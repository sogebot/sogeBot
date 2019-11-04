import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Bets {
  @PrimaryGeneratedColumn()
  id!: string;
  @Column('bigint')
  @Index()
  createdAt!: number;
  @Column('bigint')
  endedAt!: number;
  @Column({ default: false })
  isLocked!: boolean;
  /**
   * Was points already given?
   **/
  @Column({ default: false })
  arePointsGiven!: boolean;
  @Column('simple-array')
  options!: string[];
  @Column()
  title!: string;
  @OneToMany(() => BetsParticipations, (p) => p.bet, {
    cascade: true,
  })
  participations!: BetsParticipations[];
};

@Entity()
export class BetsParticipations {
  @PrimaryGeneratedColumn()
  id!: string;
  @Column()
  @Index()
  userId!: string;
  @Column()
  username!: string;
  @Column('bigint')
  points!: number;
  @Column('int')
  optionIdx!: number;
  @ManyToOne(() => Bets, (bet) => bet.participations, {
    onDelete: 'CASCADE',
  })
  bet!: Bets;
}