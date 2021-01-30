// bot libraries
import Axios from 'axios';

import { settings } from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import {  error } from '../helpers/log';
import Integration from './_interface';

let canSendRequests = true;

class LastFM extends Integration {
  @settings()
  apiKey = '';

  @settings()
  username = '';

  currentSong: null | string = null;

  @onStartup()
  onStartup() {
    setInterval(() => {
      this.fetchData();
    }, 5000);
  }

  @onChange('username')
  @onChange('apiKey')
  reEnableAfterFail() {
    canSendRequests = true;
  }

  async fetchData() {
    if (this.enabled && canSendRequests) {
      try {
        const response = await Axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${this.username}&api_key=${this.apiKey}&format=json`);
        const tracks = response.data.recenttracks.track;

        this.currentSong = null;
        for (const track of tracks) {
          if (track['@attr'] && track['@attr'].nowplaying === 'true') {
            this.currentSong = `${track.name} - ${track.artist['#text']}`;
          }
        }

      } catch(e) {
        if (e.isAxiosError) {
          if (e.response.data.error === 8) {
            error('LAST.FM: Your username is probably invalid. ' + e.response.data.message);
          } else {
            error('LAST.FM: ' + e.response.data.message);
          }
          canSendRequests = false;
        } else {
          error('LAST.FM: ' + e.stack);
        }
      }
    }
  }
}

const self = new LastFM();
export default self;
