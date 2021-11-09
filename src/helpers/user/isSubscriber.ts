import { UserInterface } from '@entity/user';

export function isSubscriber(user: UserInterface): boolean {
  return user.isSubscriber ?? false;
}