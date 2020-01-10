import { EntitySchema } from 'typeorm';

export interface ChecklistInterface {
  id: number; isCompleted: boolean; value: string;
}

export const Checklist = new EntitySchema<Readonly<Required<ChecklistInterface>>>({
  name: 'checklist',
  columns: {
    id: { type: Number, primary: true, generated: 'rowid' },
    isCompleted: { type: Boolean },
    value: { type: String },
  },
});