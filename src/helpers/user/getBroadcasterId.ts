import { variables } from '~/watchers.js';

export default function getBroadcasterId () {
  return variables.get('services.twitch.broadcasterId') as string;
}