export function getUserSender(userId: string, username: string): Readonly<CommandOptions['sender']> {
  return {
    isModerator:    true,
    username:       username,
    displayName:    username,
    userId:         userId,
    emotes:         [],
    badges:         { admin: false },
    'message-type': 'chat',
    color:          '#000000',
    userType:       'empty',
    emoteSets:      [],
    discord:        undefined,
  };
}