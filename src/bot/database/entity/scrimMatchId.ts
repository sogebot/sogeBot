import { EntitySchema } from 'typeorm';

export interface ScrimMatchIdInterface {
  id?: string;
  username: string;
  matchId: string;
}

export const ScrimMatchId = new EntitySchema<Readonly<Required<ScrimMatchIdInterface>>>({
  name:    'scrim_match_id',
  columns: {
    id: {
      type: 'uuid', primary: true, generated: 'uuid',
    },
    username: { type: String },
    matchId:  { type: String },
  },
  indices: [
    {
      name: 'IDX_5af6da125c1745151e0dfaf087', unique: true, columns: [ 'username' ],
    },
  ],
});