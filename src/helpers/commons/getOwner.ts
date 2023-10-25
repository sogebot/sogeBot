import { variables } from '~/watchers.js';

export function getOwner() {
  const generalOwners = variables.get('services.twitch.generalOwners') as string[];

  try {
    return generalOwners[0].trim();
  } catch (e: any) {
    return '';
  }
}
export function getOwners() {
  const generalOwners = variables.get('services.twitch.generalOwners') as string[];
  return generalOwners;
}