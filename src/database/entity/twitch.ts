import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer } from './_transformer';

// Cache mirror from tags endpoint
/* {
      "tag_id": "621fb5bf-5498-4d8f-b4ac-db4d40d401bf",
      "is_auto": false,
      "localization_names": {
        "bg-bg": "Завършване без продължаване",
        "cs-cz": "Na jeden z&aacute;tah", "da-dk": "1 Continue klaret",
        "de-de": "Mit nur 1 Leben",
        "el-gr": "1 χωρίς συνέχεια",
        "en-us": "1 Credit Clear",
        ...
      },
      "localization_descriptions": {
        "bg-bg": "За потоци с акцент върху завършване на аркадна игра с монети, в която не се използва продължаване",
        "cs-cz": "Pro vys&iacute;l&aacute;n&iacute; s důrazem na plněn&iacute; mincov&yacute;ch ark&aacute;dov&yacute;ch her bez použit&iacute; pokračov&aacute;n&iacute;.",
        "da-dk": "Til streams med v&aelig;gt p&aring; at gennemf&oslash;re et arkadespil uden at bruge continues",
        "de-de": "F&uuml;r Streams mit dem Ziel, ein Coin-op-Arcade-Game mit nur einem Leben abzuschlie&szlig;en.",
        "el-gr": "Για μεταδόσεις με έμφαση στην ολοκλήρωση παλαιού τύπου ηλεκτρονικών παιχνιδιών που λειτουργούν με κέρμα, χωρίς να χρησιμοποιούν συνέχειες",
        "en-us": "For streams with an emphasis on completing a coin-op arcade game without using any continues",
        ...
      }
    },
    {
      "tag_id": "7b49f69a-5d95-4c94-b7e3-66e2c0c6f6c6",
      "is_auto": false,
      "localization_names": {
        "bg-bg": "Дизайн",
        "cs-cz": "Design",
        "da-dk": "Design",
        "de-de": "Design",
        "el-gr": "Σχέδιο",
        "en-us": "Design",
        ...
      },
      "localization_descriptions": {
        "en-us": "For streams with an emphasis on the creative process of designing an object or system"
      }
    },
    {
      "tag_id": "1c628b75-b1c3-4a2f-9d1d-056c1f555f0e",
      "is_auto": true,
      "localization_names": {
        "bg-bg": "Шампион: Lux",
        "cs-cz": "Šampion: Lux",
        "da-dk": "Champion: Lux",
        ...
      },
      "localization_descriptions": {
      "en-us": "For streams featuring the champion Lux in League of Legends"
    }
*/

export interface TwitchTagInterface {
  tag_id: string; is_auto: boolean; is_current?: boolean;
  localization_names: TwitchTagLocalizationInterface[];
  localization_descriptions: TwitchTagLocalizationInterface[];
}

export interface TwitchTagLocalizationInterface {
  id?: string; locale: string; value: string; tag: TwitchTagInterface; tagId: string | null;
}

export interface TwitchStatsInterface {
  whenOnline: number;
  currentViewers?: number;
  currentSubscribers?: number;
  currentBits: number;
  currentTips: number;
  chatMessages: number;
  currentFollowers?: number;
  currentViews?: number;
  maxViewers?: number;
  newChatters?: number;
  currentWatched: number;
}

export interface TwitchClipsInterface {
  clipId: string; isChecked: boolean; shouldBeCheckedAt: number;
}

export const TwitchTag = new EntitySchema<Readonly<Required<TwitchTagInterface>>>({
  name:    'twitch_tag',
  columns: {
    tag_id:     { type: String, primary: true },
    is_auto:    { type: Boolean },
    is_current: { type: Boolean, default: false },
  },
  relations: {
    localization_names: {
      type:        'one-to-many',
      target:      'twitch_tag_localization_name',
      inverseSide: 'tag',
      cascade:     true,
    },
    localization_descriptions: {
      type:        'one-to-many',
      target:      'twitch_tag_localization_description',
      inverseSide: 'tag',
      cascade:     true,
    },
  },
});

export const TwitchTagLocalizationName = new EntitySchema<Readonly<Required<TwitchTagLocalizationInterface>>>({
  name:    'twitch_tag_localization_name',
  columns: {
    id: {
      type: 'uuid', primary: true, generated: 'uuid',
    },
    locale: { type: String },
    value:  { type: String },
    tagId:  {
      type: String, nullable: true, name: 'tagId',
    },
  },
  relations: {
    tag: {
      type:        'many-to-one',
      target:      'twitch_tag',
      joinColumn:  { name: 'tagId' },
      inverseSide: 'localization_names',
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
    },
  },
  indices: [
    {
      name:    'IDX_dcf417a56c907f3a6788476047',
      unique:  true,
      columns: [ 'tagId', 'locale' ],
    },
  ],
});

export const TwitchTagLocalizationDescription = new EntitySchema<Readonly<Required<TwitchTagLocalizationInterface>>>({
  name:    'twitch_tag_localization_description',
  columns: {
    id: {
      type: 'uuid', primary: true, generated: 'uuid',
    },
    locale: { type: String },
    value:  { type: 'text' },
    tagId:  {
      type: String, nullable: true, name: 'tagId',
    },
  },
  relations: {
    tag: {
      type:        'many-to-one',
      target:      'twitch_tag',
      joinColumn:  { name: 'tagId' },
      inverseSide: 'localization_names',
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
    },
  },
  indices: [
    {
      name:    'IDX_4d8108fc3e8dcbe5c112f53dd3',
      unique:  true,
      columns: [ 'tagId', 'locale' ],
    },
  ],
});

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
    currentViews:       { type: Number, default: 0 },
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