import { EntitySchema } from 'typeorm';

export interface SpotifySongBanInterface {
  spotifyUri: string;
  title: string;
  artists: string[];
}

export const SpotifySongBan = new EntitySchema<Readonly<Required<SpotifySongBanInterface>>>({
  name:    'spotify_song_ban',
  columns: {
    spotifyUri: { type: String, primary: true },
    title:      { type: String },
    artists:    { type: 'simple-array' },
  },
});