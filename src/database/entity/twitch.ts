import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer } from './_transformer.js';

export interface TwitchStatsInterface {
  whenOnline: number;
  currentViewers?: number;
  currentSubscribers?: number;
  currentBits: number;
  currentTips: number;
  chatMessages: number;
  currentFollowers?: number;
  maxViewers?: number;
  newChatters?: number;
  currentWatched: number;
}

export interface TwitchClipsInterface {
  clipId: string; isChecked: boolean; shouldBeCheckedAt: number;
}

export const TwitchStats = new EntitySchema<Readonly<Required<TwitchStatsInterface>>>({
  name:    'twitch_stats',
  columns: {
    whenOnline: {
      type: 'bigint', transformer: new ColumnNumericTransformer(), primary: true,
    },
    currentViewers:     { type: Number, default: 0 },
    currentSubscribers: { type: Number, default: 0 },
    chatMessages:       { type: 'bigint' },
    currentFollowers:   { type: Number, default: 0 },
    maxViewers:         { type: Number, default: 0 },
    newChatters:        { type: Number, default: 0 },
    currentBits:        { type: 'bigint', transformer: new ColumnNumericTransformer() },
    currentTips:        {
      type: 'float', transformer: new ColumnNumericTransformer(), precision: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 12 : undefined,
    },
    currentWatched: { type: 'bigint', transformer: new ColumnNumericTransformer() },
  },
});

export const TwitchClips = new EntitySchema<Readonly<Required<TwitchClipsInterface>>>({
  name:    'twitch_clips',
  columns: {
    clipId:            { type: String, primary: true },
    isChecked:         { type: Boolean },
    shouldBeCheckedAt: { type: 'bigint', transformer: new ColumnNumericTransformer() },
  },
});