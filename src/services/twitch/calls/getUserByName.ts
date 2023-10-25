import twitch from '~/services/twitch.js';

export default function getUserByName(userName: string) {
  return twitch.apiClient?.asIntent(['bot'], ctx => ctx.users.getUserByName(userName));
}