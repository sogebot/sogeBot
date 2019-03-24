'use strict';

import Overlay from './_interface';

class Polls extends Overlay {
  constructor() {
    const options: InterfaceSettings = {
      settings: {
        display: {
          theme: 'light',
          hideAfterInactivity: true,
          inactivityTime: 5000,
          align: 'top',
        },
      },
      ui: {
        display: {
          align: {
            type: 'selector',
            values: ['top', 'bottom'],
          },
          theme: {
            type: 'selector',
            values: ['light', 'dark', 'Soge\'s green'],
          },
          inactivityTime: {
            type: 'number-input',
            min: 0,
          },
        },
        links: {
          overlay: {
            type: 'link',
            href: '/overlays/polls',
            class: 'btn btn-primary btn-block',
            rawText: '/overlays/polls',
            target: '_blank',
          },
        },
      },
    };

    super(options);
  }

  public sockets() {
    global.panel.io.of('/overlays/polls').on('connection', (socket) => {
      socket.on('getVoteCommand', async (cb) => {
        cb(global.systems.polls.settings.commands['!vote']);
      });
      socket.on('data', async (callback) => {
        const currentVote: Poll = await global.db.engine.findOne(global.systems.polls.collection.data, { isOpened: true });
        const votes: Vote[] = await global.db.engine.find(global.systems.polls.collection.votes, { vid: String(currentVote._id) });
        const settings = {
          display: {
            align: this.settings.display.align,
            theme: this.settings.display.theme,
            hideAfterInactivity: this.settings.display.hideAfterInactivity,
            inactivityTime: this.settings.display.inactivityTime,
          },
        };
        callback(currentVote, votes, settings);
      });
    });
  }
}

export default Polls;
export { Polls };
