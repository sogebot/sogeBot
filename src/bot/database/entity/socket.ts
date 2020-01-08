import { EntitySchema } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

export interface SocketInterface {
  id?: string;
  userId: number;
  type: 'admin' | 'viewer' | 'public';
  accessToken: string | null;
  refreshToken: string;
  accessTokenTimestamp?: number;
  refreshTokenTimestamp?: number;
}

export const Socket = new EntitySchema<Readonly<Required<SocketInterface>>>({
  name: 'socket',
  columns: {
    id: { type: String, primary: true, generated: 'uuid' },
    userId: { type: Number },
    type: { type: 'varchar', length: 10 },
    accessToken: { type: 'varchar', length: 36, nullable: true },
    refreshToken: { type: 'varchar', length: 36, nullable: true },
    accessTokenTimestamp: { type: 'bigint', default: 0, transformer: new ColumnNumericTransformer() },
    refreshTokenTimestamp: { type: 'bigint', default: 0, transformer: new ColumnNumericTransformer() },
  },
});