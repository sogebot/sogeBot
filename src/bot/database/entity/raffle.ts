import { EntitySchema } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

export interface RaffleInterface {
  id?: string;
  winner: string | null;
  timestamp?: number;
  keyword: string;
  minTickets?: number;
  maxTickets?: number;
  type: number;
  forFollowers: boolean;
  forSubscribers: boolean;
  isClosed?: boolean;
  participants: RaffleParticipantInterface[];
}

export interface RaffleParticipantInterface {
  id?: number;
  raffle: RaffleInterface;
  username: string;
  tickets: number;
  isEligible: boolean;
  isFollower: boolean;
  isSubscriber: boolean;
  messages: RaffleParticipantMessageInterface[];
}

export interface RaffleParticipantMessageInterface {
  id?: number;
  participant?: RaffleParticipantInterface;
  timestamp: number;
  text: string;
}

export const Raffle = new EntitySchema<Readonly<Required<RaffleInterface>>>({
  name: 'raffle',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    winner: { type: 'text', nullable: true },
    timestamp: { type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0 },
    keyword: { type: String },
    minTickets: { type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0 },
    maxTickets: { type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0 },
    type: { type: Number },
    forFollowers: { type: Boolean },
    forSubscribers: { type: Boolean },
    isClosed: { type: Boolean, default: false },
  },
  indices: [
    { name: 'IDX_e83facaeb8fbe8b8ce9577209a', columns: ['keyword'] },
  ],
  relations: {
    participants: {
      type: 'one-to-many',
      target: 'raffle_participant',
      inverseSide: 'raffle',
      cascade: true,
    },
  },
});

export const RaffleParticipant = new EntitySchema<Readonly<Required<RaffleParticipantInterface>>>({
  name: 'raffle_participant',
  columns: {
    id: { type: Number, primary: true, generated: 'rowid' },
    username: { type: String },
    tickets: { type: Number },
    isEligible: { type: Boolean },
    isFollower: { type: Boolean },
    isSubscriber: { type: Boolean },
  },
  relations: {
    raffle: {
      type: 'many-to-one',
      target: 'raffle',
      inverseSide: 'participants',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    messages: {
      type: 'one-to-many',
      target: 'raffle_participant_message',
      inverseSide: 'participant',
      cascade: true,
    },
  },
});

export const RaffleParticipantMessage = new EntitySchema<Readonly<Required<RaffleParticipantMessageInterface>>>({
  name: 'raffle_participant_message',
  columns: {
    id: { type: Number, primary: true, generated: 'rowid' },
    timestamp: { type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0 },
    text: { type: 'text' },
  },
  relations: {
    participant: {
      type: 'many-to-one',
      target: 'raffle_participant',
      inverseSide: 'participant',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  },
});