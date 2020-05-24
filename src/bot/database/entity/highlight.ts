import { EntitySchema } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

export interface HighlightInterface {
  id?: number;
  videoId: string;
  game: string;
  title: string;
  timestamp: {
    hours: number; minutes: number; seconds: number;
  };
  createdAt: number;
}

export const Highlight = new EntitySchema<Readonly<Required<HighlightInterface>>>({
  name: 'highlight',
  columns: {
    id: { type: Number, primary: true, generated: 'rowid' },
    videoId: { type: String },
    game: { type: String },
    title: { type: String },
    timestamp: { type: 'simple-json' },
    createdAt: { type: 'bigint', transformer: new ColumnNumericTransformer() },
  },
});