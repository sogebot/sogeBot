import { EntitySchema } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

export interface BetsInterface {
  id?: number;
  createdAt: number;
  endedAt: number;
  isLocked?: boolean;
  /**
   * Was points already given?
   **/
  arePointsGiven?: boolean;
  options: string[];
  title: string;
  participations?: BetsParticipationsInterface[];
}

export interface BetsParticipationsInterface {
  id?: number;
  userId: number;
  username: string;
  points: number;
  optionIdx: number;
  bet?: BetsInterface;
}

export const Bets = new EntitySchema<Readonly<Required<BetsInterface>>>({
  name: 'bets',
  columns: {
    id: { type: Number, primary: true, generated: 'increment' },
    createdAt: { type: 'bigint', transformer: new ColumnNumericTransformer() },
    endedAt: { type: 'bigint', transformer: new ColumnNumericTransformer() },
    isLocked: { type: Boolean, default: false },
    arePointsGiven: { type: Boolean, default: false },
    options: { type: 'simple-array' },
    title: { type: String },
  },
  relations: {
    participations: {
      type: 'one-to-many',
      target: 'bets_participations',
      inverseSide: 'bet',
      cascade: true,
    },
  },
  indices: [
    { name: 'IDX_df40819eb0eb71d2cc7d73cea8', columns: [ 'createdAt' ] },
  ],
});

export const BetsParticipations = new EntitySchema<Readonly<Required<BetsParticipationsInterface>>>({
  name: 'bets_participations',
  columns: {
    id: { type: Number, primary: true, generated: 'increment' },
    userId: { type: Number },
    username: { type: String },
    points: { type: 'bigint', transformer: new ColumnNumericTransformer() },
    optionIdx: { type: 'bigint', transformer: new ColumnNumericTransformer() },
  },
  relations: {
    bet: {
      type: 'many-to-one',
      target: 'bets',
      inverseSide: 'participations',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  },
  indices: [
    { name: 'IDX_eb26a8222f1ed29abbef861295', columns: [ 'userId' ] },
  ],
});