'use strict';

import Overlay from './_interface';

class Voting extends Overlay {
  constructor() {
    // define special property name as readonly
    const ui = {
      links: {
        overlay: {
          type: 'link',
          href: '/overlays/voting',
          class: 'btn btn-primary btn-block',
          rawText: '/overlays/voting',
          target: '_blank',
        },
      },
    };

    super({ ui });
  }

  public sockets() {
    global.panel.io.of('/overlays/voting').on('connection', (socket) => {
      socket.on('data', async (callback) => {
        const currentVote: VotingType = await global.db.engine.findOne(global.systems.voting.collection.data, { isOpened: true });
        const votes: VoteType[] = await global.db.engine.find(global.systems.voting.collection.votes, { vid: String(currentVote._id) });
        callback(currentVote, votes);
      });
    });
  }
}

module.exports = new Voting();
