import { getBot } from './getBot';
import { getBotID } from './getBotID';

export function getBotSender(): Readonly<CommandOptions['sender']> {
  return {
    isModerator:    true,
    username:       getBot(),
    displayName:    getBot(),
    userId:         getBotID(),
    emotes:         [],
    badges:         { admin: false },
    'message-type': 'chat',
    color:          '#000000',
    userType:       'empty',
    emoteSets:      [],
    discord:        undefined,
  };
}