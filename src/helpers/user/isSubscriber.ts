import { UserInterface } from '@entity/user.js';

export function isSubscriber(user: UserInterface): boolean {
  return user.isSubscriber ?? false;
}