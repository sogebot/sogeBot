import { channelId } from '../oauth';
import { getOwner } from './getOwner';

export function getOwnerAsSender(): Readonly<UserStateTags & { userId: string }> {
  return {
    isModerator:    true,
    username:       getOwner(),
    displayName:    getOwner(),
    emotes:         [],
    badges:         { subscriber: 1 },
    'message-type': 'chat',
    color:          '#000000',
    userType:       'empty',
    emoteSets:      [],
    userId:         channelId.value,
  };
}