import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class Bets {
  @PrimaryGeneratedColumn()
  id!: string;
  @Column('bigint', { transformer: new ColumnNumericTransformer() })
  @Index()
  createdAt!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer() })
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
  userId!: number;
  @Column()
  username!: string;
  @Column('bigint', { transformer: new ColumnNumericTransformer() })
  points!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer() })
  optionIdx!: number;
  @ManyToOne(() => Bets, (bet) => bet.participations, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  bet!: Bets;
}