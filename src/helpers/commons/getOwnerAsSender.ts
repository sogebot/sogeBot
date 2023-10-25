import { getOwner } from './getOwner.js';

import { variables } from '~/watchers.js';

export function getOwnerAsSender(): Omit<ChatUser, '_userName' | '_userData' | '_parseBadgesLike'> {
  const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
  return {
    isMod:         true,
    isBroadcaster: true,
    isFounder:     true,
    isSubscriber:  true,
    isVip:         true,
    userName:      getOwner(),
    displayName:   getOwner(),
    userId:        broadcasterId,
    badges:        new Map(),
    color:         '#000000',
    userType:      'empty',
    badgeInfo:     new Map(),
    isArtist:      false,
  };
}