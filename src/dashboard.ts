import { v4 } from 'uuid';

import Core from '~/_interface.js';
import { settings } from '~/decorators.js';

class Dashboard extends Core {
  @settings()
    µWidgets = [
      'twitch|status|' + v4(),
      'twitch|uptime|' + v4(),
      'twitch|viewers|' + v4(),
      'twitch|maxViewers|' + v4(),
      'twitch|newChatters|' + v4(),
      'twitch|chatMessages|' + v4(),
      'twitch|followers|' + v4(),
      'twitch|subscribers|' + v4(),
      'twitch|bits|' + v4(),
      'general|tips|' + v4(),
      'twitch|watchedTime|' + v4(),
      'general|currentSong|' + v4(),
    ];
}

const dashboard = new Dashboard();
export default dashboard;