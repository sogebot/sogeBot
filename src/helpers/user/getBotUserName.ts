import { variables } from '~/watchers';

export default function getBotUserName () {
  return variables.get('services.twitch.botUsername') as string;
}