import { EntitySchema } from 'typeorm';

export interface RankInterface<T = 'viewer' | 'follower' | 'subscriber'> {
  id?: string;
  value: number;
  rank: string;
  type: T;
}

export const Rank = new EntitySchema<Readonly<Required<RankInterface>>>({
  name:    'rank',
  columns: {
    id: {
      type: String, primary: true, generated: 'uuid',
    },
    value: { type: Number },
    rank:  { type: String },
    type:  { type: String },
  },
  indices: [
    {
      name: 'IDX_93c78c94804a13befdace81904', unique: true, columns: [ 'type', 'value' ],
    },
  ],
});