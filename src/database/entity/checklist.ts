import { EntitySchema } from 'typeorm';

export interface ChecklistInterface {
  id: string; isCompleted: boolean;
}

export const Checklist = new EntitySchema<Readonly<Required<ChecklistInterface>>>({
  name:    'checklist',
  columns: {
    id: {
      type: String, primary: true,
    },
    isCompleted: { type: Boolean },
  },
});