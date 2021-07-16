import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer } from './_transformer';

export type currentSongType = {
  videoId: null | string, title: string, type: string, username: string, volume: number; loudness: number; forceVolume: boolean; startTime: number; endTime: number;
};

export interface SongPlaylistInterface {
  videoId: string;
  lastPlayedAt?: number;
  seed: number;
  title: string;
  tags: string[];
  loudness: number;
  length: number;
  forceVolume?: boolean;
  volume: number;
  startTime: number;
  endTime: number;
}

export interface SongRequestInterface {
  id?: string;
  videoId: string;
  addedAt?: number;
  title: string;
  loudness: number;
  length: number;
  username: string;
}
export interface SongBanInterface {
  videoId: string;
  title: string;
}

export const SongPlaylist = new EntitySchema<Readonly<Required<SongPlaylistInterface>>>({
  name:    'song_playlist',
  columns: {
    videoId:      { type: String, primary: true },
    lastPlayedAt: {
      type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0,
    },
    seed:        { type: 'float', precision: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 12 : undefined  },
    title:       { type: String },
    tags:        { type: 'simple-array' },
    loudness:    { type: 'float', precision: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 12 : undefined  },
    length:      { type: Number },
    volume:      { type: Number },
    startTime:   { type: Number },
    endTime:     { type: Number },
    forceVolume: { type: Boolean, default: false },
  },
});

export const SongRequest = new EntitySchema<Readonly<Required<SongRequestInterface>>>({
  name:    'song_request',
  columns: {
    id: {
      type: String, primary: true, generated: 'uuid',
    },
    videoId: { type: String },
    addedAt: {
      type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0,
    },
    title:    { type: String },
    loudness: { type: 'float', precision: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 12 : undefined  },
    length:   { type: Number },
    username: { type: String },
  },
});

export const SongBan = new EntitySchema<Readonly<Required<SongBanInterface>>>({
  name:    'song_ban',
  columns: {
    videoId: { type: String, primary: true },
    title:   { type: String },
  },
});