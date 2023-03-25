import Overlay from './_interface';

import { onStartup, onStreamStart } from '~/decorators/on';
import * as channelPrediction from '~/helpers/api/channelPrediction';
import { publicEndpoint } from '~/helpers/socket';
import getBroadcasterId from '~/helpers/user/getBroadcasterId';
import twitch from '~/services/twitch';

class Bets extends Overlay {
  @onStartup()
  @onStreamStart()
  async onStartup() {
    // initial load of predictions
    const predictions = await twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.predictions.getPredictions(getBroadcasterId()));
    if (predictions) {
      const prediction = predictions?.data.find(o => o.status === 'ACTIVE');
      if (prediction) {
        channelPrediction.status(prediction);
      }
    }
  }

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
