import { EntitySchema } from 'typeorm';

export interface DuelInterface {
  id?: number;
  username: string;
  tickets: number;
}

export const Duel = new EntitySchema<Readonly<Required<DuelInterface>>>({
  name: 'duel',
  columns: {
    id: { type: Number, primary: true },
    username: { type: String },
    tickets: { type: Number },
  },
});