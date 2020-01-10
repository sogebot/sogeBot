require('module-alias/register');
import { EntitySchema } from 'typeorm';
import * as configFile from '@ormconfig';

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
    data: { type: configFile.type === 'mysql' ? 'longtext' : 'text' },
    name: { type: String },
  },
});