import axios from 'axios';

import Core from './_interface';
import { settings } from './decorators';
import { onStartup } from './decorators/on';

class EventSub extends Core {
  @settings()
  clientId = '';
  @settings()
  clientSecret = '';

  appToken = '';

  async generateAppToken() {
    const url = `https://id.twitch.tv/oauth2/token?client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=client_credentials&scope=channel:read:hype_train`;
    const request = axios.post(url);
    return (await request).data.access_token;
  }

  @onStartup()
  async onStartup() {
    const token = await this.generateAppToken();
    const url = 'https://api.twitch.tv/helix/eventsub/subscriptions';
    const request = await axios.get(url, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Client-ID':     this.clientId,
      },
      timeout: 20000,
    });
    console.log({ data: request.data });
  }
}

const eventsub = new EventSub();
export default eventsub;