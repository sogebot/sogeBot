import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer } from './_transformer.js';

export interface HeistUserInterface {
  userId: string;
  username: string;
  points: number;
}

export const HeistUser = new EntitySchema<Readonly<Required<HeistUserInterface>>>({
  name:    'heist_user',
  columns: {
    userId:   { type: String, primary: true },
    username: { type: String },
    points:   { type: 'bigint', transformer: new ColumnNumericTransformer() },
  },
});