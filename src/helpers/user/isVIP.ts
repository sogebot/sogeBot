import { UserInterface } from '../../database/entity/user';

export function isVIP(user: UserInterface): boolean {
  return user.isVIP ?? false;
}