import { EntitySchema } from 'typeorm';

export interface OBSWebsocketInterface {
  id: string;
  name: string;
  code: string;
}

export const OBSWebsocket = new EntitySchema<Readonly<Required<OBSWebsocketInterface>>>({
  name:    'obswebsocket',
  columns: {
    id: {
      type: 'varchar', length: '14', primary: true,
    },
    name: { type: String },
    code: { type: 'text' },
  },
});