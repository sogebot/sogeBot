import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer } from './_transformer.js';

export interface CacheTitlesInterface {
  id?: number;
  game: string;
  title: string;
  tags: string[];
  content_classification_labels: string[];
  timestamp: number;
}

export const CacheTitles = new EntitySchema<Readonly<Required<CacheTitlesInterface>>>({
  name:    'cache_titles',
  columns: {
    id: {
      type: Number, primary: true, generated: 'increment',
    },
    game:                          { type: String },
    title:                         { type: String },
    tags:                          { type: 'simple-array' },
    content_classification_labels: { type: 'simple-array' },
    timestamp:                     { type: 'bigint', transformer: new ColumnNumericTransformer() },
  },
  indices: [
    { name: 'IDX_a0c6ce833b5b3b13325e6f49b0', columns: ['game'] },
  ],
});