import { UserInterface } from '@entity/user';

export function isFollower(user: UserInterface): boolean {
  return user.isFollower ?? false;
}