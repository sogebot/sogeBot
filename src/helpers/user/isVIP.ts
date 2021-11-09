import { UserInterface } from '@entity/user';

export function isVIP(user: UserInterface): boolean {
  return user.isVIP ?? false;
}