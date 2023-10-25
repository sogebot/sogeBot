import { isBroadcaster } from '../user/index.js';

export function getUserSender(userId: string, username: string): Omit<ChatUser, '_userName' | '_userData' | '_parseBadgesLike'> {
  return {
    isMod:         false,
    isBroadcaster: isBroadcaster(username),
    isFounder:     false,
    isSubscriber:  false,
    isVip:         false,
    userName:      username,
    displayName:   username,
    userId:        userId,
    badges:        new Map(),
    color:         '#000000',
    userType:      'empty',
    badgeInfo:     new Map(),
    isArtist:      false,
  };
}