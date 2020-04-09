import { EntitySchema } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

export interface DiscordLinkInterface {
  id?: string;
  tag: string;
  createdAt: number;
  userId: null | number;
};

export const DiscordLink = new EntitySchema<Readonly<Required<DiscordLinkInterface>>>({
  name: 'discord_link',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    tag: { type: String },
    createdAt: { type: 'bigint', transformer: new ColumnNumericTransformer() },
    userId: { type: Number, nullable: true },
  },
});
