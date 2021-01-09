import { UserInterface } from '../../database/entity/user';

export function isSubscriber(user: UserInterface): boolean {
  return user.isSubscriber ?? false;
}