import { randomUUID } from 'node:crypto';

import Core from '~/_interface.js';
import { settings } from '~/decorators.js';

class Dashboard extends Core {

  @settings()
  µWidgets = [
    'twitch|status|' + randomUUID(),
    'twitch|uptime|' + randomUUID(),
    'twitch|viewers|' + randomUUID(),
    'twitch|maxViewers|' + randomUUID(),
    'twitch|newChatters|' + randomUUID(),
    'twitch|chatMessages|' + randomUUID(),
    'twitch|followers|' + randomUUID(),
    'twitch|subscribers|' + randomUUID(),
    'twitch|bits|' + randomUUID(),
    'general|tips|' + randomUUID(),
    'twitch|watchedTime|' + randomUUID(),
    'general|currentSong|' + randomUUID(),
  ];
}

const dashboard = new Dashboard();
export default dashboard;