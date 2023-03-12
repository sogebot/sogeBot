import { variables } from '~/watchers';

export default function getBotId () {
  return variables.get('services.twitch.botId') as string;
}