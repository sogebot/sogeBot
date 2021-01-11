import type { UserInterface } from '../../database/entity/user';

export function isModerator(user: UserInterface | UserStateTags): boolean {
  if ('mod' in user) {
    return user.mod === '1';
  }
  return user.isModerator ?? false;
}