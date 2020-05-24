import { EntitySchema } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

export interface HowLongToBeatGameInterface {
  id?: number;
  game: string;
  startedAt?: number;
  isFinishedMain: boolean;
  isFinishedCompletionist: boolean;
  timeToBeatMain?: number;
  timeToBeatCompletionist?: number;
  gameplayMain?: number;
  gameplayCompletionist?: number;
  imageUrl: string;
}

export const HowLongToBeatGame = new EntitySchema<Readonly<Required<HowLongToBeatGameInterface>>>({
  name: 'how_long_to_beat_game',
  columns: {
    id: { type: Number, primary: true, generated: 'rowid' },
    game: { type: String },
    imageUrl: { type: String },
    isFinishedMain: { type: Boolean },
    isFinishedCompletionist: { type: Boolean },
    startedAt: { type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0 },
    timeToBeatMain: { type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0 },
    timeToBeatCompletionist: { type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0 },
    gameplayMain: { type: 'float', transformer: new ColumnNumericTransformer(), default: 0, precision: (process.env.TYPEORM_CONNECTION ?? 'sqlite') === 'mysql' ? 12 : undefined  },
    gameplayCompletionist: { type: 'float', transformer: new ColumnNumericTransformer(), default: 0, precision: (process.env.TYPEORM_CONNECTION ?? 'sqlite') === 'mysql' ? 12 : undefined  },
  },
  indices: [
    { name: 'IDX_301758e0e3108fc902d5436527', columns: ['game'], unique: true },
  ],
});