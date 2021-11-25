import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer } from './_transformer';

export interface HighlightInterface {
  id?: string;
  videoId: string;
  game: string;
  title: string;
  expired: boolean;
  timestamp: {
    hours: number; minutes: number; seconds: number;
  };
  createdAt: number;
}

export const Highlight = new EntitySchema<Readonly<Required<HighlightInterface>>>({
  name:    'highlight',
  columns: {
    id: {
      type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 'char' : 'uuid', primary: true, generated: 'uuid', length: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 36 : undefined,
    },
    videoId:   { type: String },
    game:      { type: String },
    title:     { type: String },
    expired:   { type: Boolean, default: false },
    timestamp: { type: 'simple-json' },
    createdAt: { type: 'bigint', transformer: new ColumnNumericTransformer() },
  },
});