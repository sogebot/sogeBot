import { variables } from '~/watchers';

export default function getBroadcasterUserName () {
  return variables.get('services.twitch.broadcasterUsername') as string;
}