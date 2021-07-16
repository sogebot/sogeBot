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
      type: 'uuid', primary: true, generated: 'uuid',
    },
    videoId:   { type: String },
    game:      { type: String },
    title:     { type: String },
    expired:   { type: Boolean, default: false },
    timestamp: { type: 'simple-json' },
    createdAt: { type: 'bigint', transformer: new ColumnNumericTransformer() },
  },
});