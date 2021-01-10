import { generalOwners } from '../oauth/generalOwners';

export function getOwner() {
  try {
    return generalOwners[0].trim();
  } catch (e) {
    return '';
  }
}
export function getOwners() {
  return generalOwners;
}