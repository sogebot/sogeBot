import { variable } from '~/helpers/variables';

export function getOwner() {
  const generalOwners = variable.get('services.twitch.generalOwners') as string[];

  try {
    return generalOwners[0].trim();
  } catch (e: any) {
    return '';
  }
}
export function getOwners() {
  const generalOwners = variable.get('services.twitch.generalOwners') as string[];
  return generalOwners;
}