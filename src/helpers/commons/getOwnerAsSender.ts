import { channelId } from '../oauth';
import { getOwner } from './getOwner';

export function getOwnerAsSender(): Omit<ChatUser, '_userName' | '_userData' | '_parseBadgesLike'> {
  return {
    isMod:         true,
    isBroadcaster: true,
    isFounder:     true,
    isSubscriber:  true,
    isVip:         true,
    userName:      getOwner(),
    displayName:   getOwner(),
    userId:        channelId.value,
    badges:        new Map(),
    color:         '#000000',
    userType:      'empty',
    badgeInfo:     new Map(),
  };
}