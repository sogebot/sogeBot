import { EntitySchema } from 'typeorm';

export interface OverlayMapperInterface {
  id: string;
  value: string | null;
}

export const OverlayMapper = new EntitySchema<Readonly<Required<OverlayMapperInterface>>>({
  name:    'overlay_mapper',
  columns: {
    id:    { type: String, primary: true, generated: 'uuid' },
    value: { type: String, nullable: true },
  },
});