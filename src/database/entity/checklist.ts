import { EntitySchema } from 'typeorm';

export interface ChecklistInterface {
  id: string; isCompleted: boolean; value: string;
}

export const Checklist = new EntitySchema<Readonly<Required<ChecklistInterface>>>({
  name:    'checklist',
  columns: {
    id: {
      type: 'uuid', primary: true, generated: 'uuid', 
    },
    isCompleted: { type: Boolean },
    value:       { type: String },
  },
});