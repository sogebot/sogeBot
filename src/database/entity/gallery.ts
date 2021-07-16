import { EntitySchema } from 'typeorm';

export interface GalleryInterface {
  id?: string;
  type: string;
  data: string;
  name: string;
  folder: string;
}

export const Gallery = new EntitySchema<Readonly<Required<GalleryInterface>>>({
  name:    'gallery',
  columns: {
    id: {
      type: String, primary: true, generated: 'uuid',
    },
    type:   { type: String },
    data:   { type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 'longtext' : 'text' },
    name:   { type: String },
    folder: { type: String, default: '/' },
  },
});