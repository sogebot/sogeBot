import oauth from '../../oauth';

export function getOwner() {
  try {
    return oauth.generalOwners[0].trim();
  } catch (e) {
    return '';
  }
}
export function getOwners() {
  return oauth.generalOwners;
}