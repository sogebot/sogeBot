import { EntitySchema } from 'typeorm';

export interface BannedEventsInterface {
  'id': string,
  'event_type': 'moderation.user.ban' | 'moderation.user.unban',
  'event_timestamp': string,
  'version': '1.0',
  'event_data': {
    'broadcaster_id': string,
    'broadcaster_login': string,
    'broadcaster_name': string,
    'user_id': string,
    'user_login': string,
    'user_name': string,
    'expires_at': string,
    'reason': string,
    'moderator_id': string,
    'moderator_login': string,
    'moderator_name': string
  }
}

export const BannedEventsTable = new EntitySchema<BannedEventsInterface>({
  name:    'bannedEvents',
  columns: {
    id: {
      type:    String,
      primary: true,
    },
    event_type:      { type: String },
    event_timestamp: { type: String },
    version:         { type: String },
    event_data:      { type: 'simple-json' },
  },
});