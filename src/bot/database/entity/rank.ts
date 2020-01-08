import { EntitySchema } from 'typeorm';

export interface RankInterface {
  id?: string;
  hours: number;
  rank: string;
}

export const Rank = new EntitySchema<Readonly<Required<RankInterface>>>({
  name: 'rank',
  columns: {
    id: { type: String, primary: true, generated: 'uuid' },
    hours: { type: Number },
    rank: { type: String },
  },
  indices: [
    { name: 'IDX_93c78c94804a13befdace81904', unique: true, columns: [ 'hours' ]},
  ],
});