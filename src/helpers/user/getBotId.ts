import { variables } from '~/watchers.js';

export default function getBotId () {
  return variables.get('services.twitch.botId') as string;
}