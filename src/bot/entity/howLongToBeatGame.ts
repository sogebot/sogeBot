import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class HowLongToBeatGame {
  @PrimaryGeneratedColumn()
  id!: string;
  @Column()
  @Index({unique: true})
  game!: string;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  startedAt!: number;
  @Column()
  isFinishedMain!: boolean;
  @Column()
  isFinishedCompletionist!: boolean;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  timeToBeatMain!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  timeToBeatCompletionist!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  gameplayMain!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  gameplayCompletionist!: number;
  @Column()
  imageUrl!: string;
};