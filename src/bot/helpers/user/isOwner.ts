import { UserInterface } from '../../database/entity/user';
import oauth from '../../oauth';

export function isOwner(user: string | CommandOptions['sender'] | UserInterface | UserStateTags) {
  try {
    if (oauth.generalOwners) {
      const owners = oauth.generalOwners.filter(o => typeof o === 'string').map(o => o.trim().toLowerCase());
      return owners.includes(typeof user === 'string' ? user : user.username.toLowerCase().trim());
    } else {
      return false;
    }
  } catch (e) {
    return true; // we can expect, if user is null -> bot or admin
  }
}