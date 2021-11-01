import Core from './_interface';
import { settings } from './decorators';

class Dashboard extends Core {
  @settings()
  miniWidgets = [
    'twitch|status',
    'twitch|uptime',
    'twitch|viewers',
    'twitch|maxViewers',
    'twitch|newChatters',
    'twitch|chatMessages',
    'twitch|views',
    'twitch|followers',
    'twitch|subscribers',
    'twitch|bits',
    'general|tips',
    'twitch|watchedTime',
    'general|currentSong',
  ];
}

const dashboard = new Dashboard();
export default dashboard;