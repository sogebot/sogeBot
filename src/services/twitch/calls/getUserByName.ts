import twitch from '~/services/twitch';

export default function getUserByName(userName: string) {
  return twitch.apiClient?.asIntent(['bot'], ctx => ctx.users.getUserByName(userName));
}