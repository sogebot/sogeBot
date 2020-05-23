import { EntitySchema } from 'typeorm';

export interface CacheGamesInterface {
  id?: number;
  name: string;
}

export const CacheGames = new EntitySchema<Readonly<Required<CacheGamesInterface>>>({
  name: 'cache_games',
  columns: {
    id: { type: Number, primary: true },
    name: { type: String },
  },
  indices: [
    { name: 'IDX_f37be3c66dbd449a8cb4fe7d59', columns: ['name'] },
  ],
});