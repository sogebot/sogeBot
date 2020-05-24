import { EntitySchema } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

export interface HeistUserInterface {
  userId: number;
  username: string;
  points: number;
}

export const HeistUser = new EntitySchema<Readonly<Required<HeistUserInterface>>>({
  name: 'heist_user',
  columns: {
    userId: { type: Number, primary: true },
    username: { type: String },
    points: { type: 'bigint', transformer: new ColumnNumericTransformer() },
  },
});