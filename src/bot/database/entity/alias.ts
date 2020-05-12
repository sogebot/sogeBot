import { EntitySchema } from 'typeorm';

export interface AliasInterface {
  id?: string;
  alias: string;
  command: string;
  enabled: boolean;
  visible: boolean;
  permission: string;
  group: string | null;
}

export const Alias = new EntitySchema<Readonly<Required<AliasInterface>>>({
  name: 'alias',
  columns: {
    id: { type: String, primary: true, generated: 'uuid' },
    alias: { type: String, nullable: false },
    command: { type: 'text' },
    enabled: { type: Boolean },
    visible: { type: Boolean },
    permission: { type: String },
    group: { type: String, nullable: true },
  },
  indices: [
    { name: 'IDX_6a8a594f0a5546f8082b0c405c', columns: ['alias'] },
  ],
});