import { UserInterface } from '@entity/user.js';

export function isVIP(user: UserInterface): boolean {
  return user.isVIP ?? false;
}