import { variables } from '~/watchers';

export default function getBroadcasterId () {
  return variables.get('services.twitch.broadcasterId') as string;
}