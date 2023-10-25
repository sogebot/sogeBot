import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer } from './_transformer.js';

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
      type: 'uuid', primary: true, generated: 'uuid',
    },
    tag:       { type: String },
    discordId: { type: String },
    createdAt: { type: 'bigint', transformer: new ColumnNumericTransformer() },
    userId:    { type: String, nullable: true },
  },
});
