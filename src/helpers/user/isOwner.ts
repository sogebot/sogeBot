import { UserInterface } from '@entity/user.js';

import { variables } from '~/watchers.js';

export function isOwner(user: string | CommandOptions['sender'] | UserInterface | UserStateTags) {
  try {
    const generalOwners = variables.get('services.twitch.generalOwners') as string[];
    if (generalOwners) {
      const owners = generalOwners.filter(o => typeof o === 'string').map(o => o.trim().toLowerCase());
      return owners.includes(typeof user === 'string' ? user : user.userName.toLowerCase().trim());
    } else {
      return false;
    }
  } catch (e: any) {
    return true; // we can expect, if user is null -> bot or admin
  }
}