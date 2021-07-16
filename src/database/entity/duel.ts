import { EntitySchema } from 'typeorm';

export interface DuelInterface {
  id?: string;
  username: string;
  tickets: number;
}

export const Duel = new EntitySchema<Readonly<Required<DuelInterface>>>({
  name:    'duel',
  columns: {
    id:       { type: String, primary: true },
    username: { type: String },
    tickets:  { type: Number },
  },
});