import type { UserInterface } from '../../database/entity/user';

export function isModerator(user: UserInterface | Omit<ChatUser, '_userName' | '_userData' | '_parseBadgesLike'>): boolean {
  if ('isMod' in user) {
    return user.isMod;
  }
  return user.isModerator ?? false;
}