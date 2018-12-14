'use strict';

import Overlay from './_interface';

class Voting extends Overlay {
  [x: string]: any; // TODO: remove after interface ported to TS

  constructor() {
    const options: InterfaceSettings = {
      settings: {
        display: {
          theme: 'light',
          hideAfterInactivity: true,
          inactivityTime: 5000,
        },
      },
      ui: {
        display: {
          theme: {
            type: 'selector',
            values: ['light', 'dark'],
          },
          inactivityTime: {
            type: 'number-input',
            min: 0,
          },
        },
        links: {
          overlay: {
            type: 'link',
            href: '/overlays/voting',
            class: 'btn btn-primary btn-block',
            rawText: '/overlays/voting',
            target: '_blank',
          },
        },
      },
    };

    super(options);
  }

  public sockets() {
    global.panel.io.of('/overlays/voting').on('connection', (socket) => {
      socket.on('data', async (callback) => {
        const currentVote: VotingType = await global.db.engine.findOne(global.systems.voting.collection.data, { isOpened: true });
        const votes: VoteType[] = await global.db.engine.find(global.systems.voting.collection.votes, { vid: String(currentVote._id) });
        const settings = {
          display: {
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

module.exports = new Voting();
