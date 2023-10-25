import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer, SafeNumberTransformer } from './_transformer.js';

export type Currency = 'USD' | 'AUD' | 'BGN' | 'BRL' | 'CAD' | 'CHF' | 'CNY' | 'CZK' | 'DKK' | 'EUR' | 'GBP' | 'HKD' | 'HRK' | 'HUF' | 'IDR' | 'ILS' | 'INR' | 'ISK' | 'JPY' | 'KRW' | 'MXN' | 'MYR' | 'NOK' | 'NZD' | 'PHP' | 'PLN' | 'RON' | 'RUB' | 'SEK' | 'SGD' | 'THB' | 'TRY' | 'ZAR' | 'UAH';

export interface UserInterface {
  userId: string; userName: string; displayname?: string; profileImageUrl?: string;
  isOnline?: boolean; isVIP?: boolean; isModerator?: boolean; isSubscriber?: boolean;
  haveSubscriberLock?: boolean; haveSubscribedAtLock?: boolean; rank?: string; haveCustomRank?: boolean;
  subscribedAt?: string | null; seenAt?: string | null; createdAt?: string | null;
  watchedTime?: number; chatTimeOnline?: number; chatTimeOffline?: number;
  points?: number; pointsOnlineGivenAt?: number; pointsOfflineGivenAt?: number; pointsByMessageGivenAt?: number;
  subscribeTier?: string; subscribeCumulativeMonths?: number; subscribeStreak?: number; giftedSubscribes?: number;
  messages?: number;
  extra: {
    jackpotWins?: number;
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
  id?: string; amount: number; currency: Currency; message: string; tippedAt?: number; sortAmount: number;
  exchangeRates: { [key in Currency]: number }; userId: string;
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
    userName:    { type: String },
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
    isModerator:          { type: Boolean, default: false },
    isSubscriber:         { type: Boolean, default: false },
    haveSubscriberLock:   { type: Boolean, default: false },
    haveSubscribedAtLock: { type: Boolean, default: false },
    rank:                 { type: String, default: '' },
    haveCustomRank:       { type: Boolean, default: false },
    subscribedAt:         {
      type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length, nullable: true,
    },
    seenAt: {
      type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length, nullable: true,
    },
    createdAt: {
      type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length, nullable: true,
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
      columns: [ 'userName' ],
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
  indices: [
    {
      name:    'IDX_user_tip_userId',
      columns: [ 'userId' ],
    },
  ],
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
  indices: [
    {
      name:    'IDX_user_bit_userId',
      columns: [ 'userId' ],
    },
  ],
});