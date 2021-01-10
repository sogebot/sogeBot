import { generalOwners } from '../oauth/generalOwners';

export function getOwner() {
  try {
    return generalOwners.value[0].trim();
  } catch (e) {
    return '';
  }
}
export function getOwners() {
  return generalOwners.value;
}