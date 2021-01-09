import { UserInterface } from '../../database/entity/user';

export function isFollower(user: UserInterface): boolean {
  return user.isFollower ?? false;
}