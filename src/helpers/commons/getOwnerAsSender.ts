import { getOwner } from './getOwner';

import { variable } from '~/helpers/variables';

export function getOwnerAsSender(): Omit<ChatUser, '_userName' | '_userData' | '_parseBadgesLike'> {
  const channelId = variable.get('services.twitch.channelId') as string;
  return {
    isMod:         true,
    isBroadcaster: true,
    isFounder:     true,
    isSubscriber:  true,
    isVip:         true,
    userName:      getOwner(),
    displayName:   getOwner(),
    userId:        channelId,
    badges:        new Map(),
    color:         '#000000',
    userType:      'empty',
    badgeInfo:     new Map(),
  };
}