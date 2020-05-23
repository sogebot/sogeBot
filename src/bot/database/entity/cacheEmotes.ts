import { EntitySchema } from 'typeorm';

export interface CacheEmotesInterface {
  id?: string;
  code: string;
  type: 'twitch' | 'ffz' | 'bttv';
  urls: { '1': string; '2': string; '3': string };
}

export const CacheEmotes = new EntitySchema<Readonly<Required<CacheEmotesInterface>>>({
  name: 'cache_emotes',
  columns: {
    id: { type: String, primary: true, generated: 'uuid' },
    code: { type: String },
    type: { type: 'varchar', length: 6 },
    urls: { type: 'simple-json' },
  },
  indices: [
    { name: 'IDX_36cd5732ccfc2693662be974f9', columns: ['code'] },
  ],
});