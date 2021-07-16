import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer, SafeNumberTransformer } from './_transformer';

export interface UserInterface {
  id?: string; userId: string; username: string; displayname?: string; profileImageUrl?: string;
  isOnline?: boolean; isVIP?: boolean; isFollower?: boolean; isModerator?: boolean; isSubscriber?: boolean;
  haveSubscriberLock?: boolean; haveFollowerLock?: boolean; haveSubscribedAtLock?: boolean; haveFollowedAtLock?: boolean; rank?: string; haveCustomRank?: boolean;
  followedAt?: number; followCheckAt?: number; subscribedAt?: number; seenAt?: number; createdAt?: number;
  watchedTime?: number; chatTimeOnline?: number; chatTimeOffline?: number;
  points?: number; pointsOnlineGivenAt?: number; pointsOfflineGivenAt?: number; pointsByMessageGivenAt?: number;
  subscribeTier?: string; subscribeCumulativeMonths?: number; subscribeStreak?: number; giftedSubscribes?: number;
  messages?: number;
  extra: {
    levels?: {
      xp: string; // we need to use string as we cannot stringify bigint in typeorm
      xpOfflineGivenAt: number;
      xpOfflineMessages: number;
      xpOnlineGivenAt: number;
      xpOnlineMessages: number;
    },
  } | null
}

export interface UserTipInterface {
  id?: string; amount: number; currency: currency; message: string; tippedAt?: number; sortAmount: number;
  exchangeRates: { [key in currency]: number }; userId: string;
}

export interface UserBitInterface {
  id?: string; amount: number; message: string; cheeredAt?: number;
  userId: string;
}

export const User = new EntitySchema<Readonly<Required<UserInterface>>>({
  name:    'user',
  columns: {
    userId: {
      type:    String,
      primary: true,
    },
    username:    { type: String },
    displayname: {
      type:    String,
      default: '',
    },
    profileImageUrl: {
      type:    String,
      default: '',
    },
    isOnline:             { type: Boolean, default: false },
    isVIP:                { type: Boolean, default: false },
    isFollower:           { type: Boolean, default: false },
    isModerator:          { type: Boolean, default: false },
    isSubscriber:         { type: Boolean, default: false },
    haveSubscriberLock:   { type: Boolean, default: false },
    haveFollowerLock:     { type: Boolean, default: false },
    haveSubscribedAtLock: { type: Boolean, default: false },
    haveFollowedAtLock:   { type: Boolean, default: false },
    rank:                 { type: String, default: '' },
    haveCustomRank:       { type: Boolean, default: false },
    followedAt:           {
      type: 'bigint', default: 0, transformer: new ColumnNumericTransformer(),
    },
    followCheckAt: {
      type: 'bigint', default: 0, transformer: new ColumnNumericTransformer(),
    },
    subscribedAt: {
      type: 'bigint', default: 0, transformer: new ColumnNumericTransformer(),
    },
    seenAt: {
      type: 'bigint', default: 0, transformer: new ColumnNumericTransformer(),
    },
    createdAt: {
      type: 'bigint', default: 0, transformer: new ColumnNumericTransformer(),
    },
    watchedTime: {
      type: 'bigint', default: 0, transformer: new ColumnNumericTransformer(),
    },
    chatTimeOnline: {
      type: 'bigint', default: 0, transformer: new ColumnNumericTransformer(),
    },
    chatTimeOffline: {
      type: 'bigint', default: 0, transformer: new ColumnNumericTransformer(),
    },
    points: {
      type: 'bigint', default: 0, transformer: new SafeNumberTransformer(),
    },
    pointsOnlineGivenAt: {
      type: 'bigint', default: 0, transformer: new ColumnNumericTransformer(),
    },
    pointsOfflineGivenAt: {
      type: 'bigint', default: 0, transformer: new ColumnNumericTransformer(),
    },
    pointsByMessageGivenAt: {
      type: 'bigint', default: 0, transformer: new ColumnNumericTransformer(),
    },
    subscribeTier:             { type: String, default: '0' },
    subscribeCumulativeMonths: { type: Number, default: 0 },
    subscribeStreak:           { type: Number, default: 0 },
    giftedSubscribes:          {
      type: 'bigint', default: 0, transformer: new ColumnNumericTransformer(),
    },
    messages: {
      type: 'bigint', default: 0, transformer: new ColumnNumericTransformer(),
    },
    extra: { type: 'simple-json', nullable: true },
  },
  indices: [
    {
      name:    'IDX_78a916df40e02a9deb1c4b75ed',
      columns: [ 'username' ],
    },
  ],
});

export const UserTip = new EntitySchema<Readonly<Required<UserTipInterface>>>({
  name:    'user_tip',
  columns: {
    id: {
      type:      Number,
      primary:   true,
      generated: 'increment',
    },
    amount:        { type: 'float', precision: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 12 : undefined  },
    sortAmount:    { type: 'float', precision: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 12 : undefined  },
    exchangeRates: { type: 'simple-json' },
    currency:      { type: String },
    message:       { type: 'text' },
    tippedAt:      {
      type: 'bigint', default: 0, transformer: new ColumnNumericTransformer(),
    },
    userId: { type: String, nullable: true },
  },
});

export const UserBit = new EntitySchema<Readonly<Required<UserBitInterface>>>({
  name:    'user_bit',
  columns: {
    id: {
      type:      Number,
      primary:   true,
      generated: 'increment',
    },
    amount:    { type: 'bigint', transformer: new ColumnNumericTransformer() },
    message:   { type: 'text' },
    cheeredAt: {
      type: 'bigint', default: 0, transformer: new ColumnNumericTransformer(),
    },
    userId: { type: String, nullable: true },
  },
});