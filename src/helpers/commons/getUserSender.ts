export function getUserSender(userId: string, username: string): Readonly<CommandOptions['sender']> {
  return {
    isMod:            false,
    isBroadcaster:    false,
    isFounder:        false,
    isSubscriber:     false,
    isVip:            false,
    userName:         username,
    displayName:      username,
    userId:           userId,
    badges:           new Map(),
    color:            '#000000',
    userType:         'empty',
    discord:          undefined,
    badgeInfo:        new Map(),
    _userName:        username,
    _parseBadgesLike: null,
  };
}