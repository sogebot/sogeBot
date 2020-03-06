require('module-alias/register');
import { EntitySchema, getConnectionOptions } from 'typeorm';

const connOpts = await getConnectionOptions();

export interface GalleryInterface {
  id?: string;
  type: string;
  data: string;
  name: string;
}

export const Gallery = new EntitySchema<Readonly<Required<GalleryInterface>>>({
  name: 'gallery',
  columns: {
    id: { type: String, primary: true, generated: 'uuid' },
    type: { type: String },
    data: { type: connOpts.type === 'mysql' ? 'longtext' : 'text' },
    name: { type: String },
  },
});