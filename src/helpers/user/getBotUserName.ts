import { variables } from '~/watchers.js';

export default function getBotUserName () {
  return variables.get('services.twitch.botUsername') as string;
}