import { variables } from '~/watchers.js';

export default function getBroadcasterUserName () {
  return variables.get('services.twitch.broadcasterUsername') as string;
}