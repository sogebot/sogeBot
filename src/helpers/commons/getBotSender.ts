import { getBot } from './getBot';
import { getBotID } from './getBotID';

export function getBotSender(): Omit<ChatUser, '_userName' | '_userData' | '_parseBadgesLike'> {
  return {
    isMod:         true,
    isBroadcaster: false,
    isFounder:     false,
    isSubscriber:  false,
    isVip:         false,
    userName:      getBot(),
    displayName:   getBot(),
    userId:        getBotID(),
    badges:        new Map(),
    color:         '#000000',
    userType:      'empty',
    badgeInfo:     new Map(),
    isArtist:      false,
  };
}