import { UserInterface } from '../../database/entity/user';
import { generalOwners } from '../oauth/generalOwners';

export function isOwner(user: string | CommandOptions['sender'] | UserInterface | UserStateTags) {
  try {
    if (generalOwners.value) {
      const owners = generalOwners.value.filter(o => typeof o === 'string').map(o => o.trim().toLowerCase());
      return owners.includes(typeof user === 'string' ? user : user.userName.toLowerCase().trim());
    } else {
      return false;
    }
  } catch (e: any) {
    return true; // we can expect, if user is null -> bot or admin
  }
}