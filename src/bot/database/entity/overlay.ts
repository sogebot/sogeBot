import { EntitySchema } from 'typeorm';

export interface OverlayMapperInterface {
  id: string;
  value: string | null;
  opts: null
}

export interface OverlayMapperOBSWebsocket {
  id: string;
  value: 'obswebsocket';
  opts: null | {
    allowedIPs: [],
  },
}

export const OverlayMapper = new EntitySchema<Readonly<Required<OverlayMapperInterface | OverlayMapperOBSWebsocket>>>({
  name: 'overlay_mapper',
  columns: {
    id:    { type: String, primary: true, generated: 'uuid' },
    value: { type: String, nullable: true },
    opts: { type: 'simple-json', nullable: true },
  },
});