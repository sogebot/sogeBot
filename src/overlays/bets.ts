import Overlay from './_interface.js';

import * as channelPrediction from '~/helpers/api/channelPrediction.js';
import { publicEndpoint } from '~/helpers/socket.js';

class Bets extends Overlay {
  public sockets() {
    publicEndpoint(this.nsp, 'data', async (callback) => {
      const data = channelPrediction.status();
      callback(data ? {
        id:               data.id,
        title:            data.title,
        autoLockAfter:    'autoLockAfter' in data ? data.autoLockAfter : null,
        creationDate:     data.creationDate ? new Date(data.creationDate).toISOString() : null,
        lockDate:         data.lockDate ? new Date(data.lockDate).toISOString() : null,
        outcomes:         data.outcomes,
        winningOutcomeId: 'winningOutcomeId' in data ? data.winningOutcomeId : null,
        winningOutcome:   'winningOutcome' in data ? data.winningOutcome : null,
      } : null);
    });
  }
}

export default new Bets();
