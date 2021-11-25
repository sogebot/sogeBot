import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer } from './_transformer';

export interface HowLongToBeatGameInterface {
  id?: string;
  game: string;
  startedAt?: number;
  imageUrl: string;
  gameplayMain: number;
  gameplayMainExtra: number;
  gameplayCompletionist: number;
  offset: number;
}

export interface HowLongToBeatGameItemInterface {
  id?: string;
  hltb_id: string;
  createdAt: number;
  timestamp: number;
  offset: number;
  isMainCounted: boolean;
  isCompletionistCounted: boolean;
  isExtraCounted: boolean;
}

export const HowLongToBeatGame = new EntitySchema<Readonly<Required<HowLongToBeatGameInterface>>>({
  name:    'how_long_to_beat_game',
  columns: {
    id: {
      type: 'char', primary: true, generated: 'uuid', length: 36,
    },
    game:      { type: String },
    imageUrl:  { type: String },
    startedAt: { type: 'bigint', transformer: new ColumnNumericTransformer() },
    offset:    {
      type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0,
    },
    gameplayMain: {
      type: 'float', transformer: new ColumnNumericTransformer(), default: 0, precision: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 12 : undefined,
    },
    gameplayMainExtra: {
      type: 'float', transformer: new ColumnNumericTransformer(), default: 0, precision: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 12 : undefined,
    },
    gameplayCompletionist: {
      type: 'float', transformer: new ColumnNumericTransformer(), default: 0, precision: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 12 : undefined,
    },
  },
  indices: [
    {
      name: 'IDX_301758e0e3108fc902d5436527', columns: ['game'], unique: true,
    },
  ],
});

export const HowLongToBeatGameItem = new EntitySchema<Readonly<Required<HowLongToBeatGameItemInterface>>>({
  name:    'how_long_to_beat_game_item',
  columns: {
    id: {
      type: 'char', primary: true, generated: 'uuid', length: 36,
    },
    hltb_id:   { type: 'uuid' },
    createdAt: { type: 'bigint', transformer: new ColumnNumericTransformer() },
    timestamp: {
      type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0,
    },
    offset: {
      type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0,
    },
    isMainCounted:          { type: Boolean, default: false },
    isCompletionistCounted: { type: Boolean, default: false },
    isExtraCounted:         { type: Boolean, default: false },
  },
  indices: [
    { name: 'IDX_hltb_id', columns: ['hltb_id'] },
  ],
});