import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer } from './_transformer';

export interface DiscordLinkInterface {
  id: string | undefined;
  tag: string;
  discordId: string;
  createdAt: number;
  userId: null | string;
}

export const DiscordLink = new EntitySchema<Readonly<Required<DiscordLinkInterface>>>({
  name:    'discord_link',
  columns: {
    id: {
      type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 'char' : 'uuid', primary: true, generated: 'uuid', length: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 36 : undefined,
    },
    tag:       { type: String },
    discordId: { type: String },
    createdAt: { type: 'bigint', transformer: new ColumnNumericTransformer() },
    userId:    { type: String, nullable: true },
  },
});
