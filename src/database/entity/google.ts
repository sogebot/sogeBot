import { EntitySchema } from 'typeorm';

export class GooglePrivateKeysInterface {
  id: string | undefined;
  clientEmail: string;
  privateKey: string;
  createdAt: string;
}

export const GooglePrivateKeys = new EntitySchema<Readonly<Required<GooglePrivateKeysInterface>>>({
  name:    'google_private_keys',
  columns: {
    id: {
      type: 'uuid', primary: true, generated: 'uuid',
    },
    clientEmail: { type: String },
    privateKey:  { type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 'longtext' : 'text' },
    createdAt:   { type: String },
  },
});
