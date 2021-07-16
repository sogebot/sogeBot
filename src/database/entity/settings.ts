import { EntitySchema } from 'typeorm';

export interface SettingsInterface {
  id: number;
  namespace: string;
  name: string;
  value: string;
}

export const Settings = new EntitySchema<SettingsInterface>({
  name:    'settings',
  columns: {
    id: {
      type:      Number,
      primary:   true,
      generated: true,
    },
    namespace: { type: String },
    name:      { type: String },
    value:     { type: 'text' },
  },
  indices: [
    {
      name:    'IDX_d8a83b9ffce680092c8dfee37d',
      columns: [ 'namespace', 'name' ],
      unique:  true,
    },
  ],
});