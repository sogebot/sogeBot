import { getRepository } from 'typeorm';
import { GooglePrivateKeys } from '~/database/entity/google';
import { app } from '~/helpers/panel';
import { adminMiddleware } from '~/socket';
import { onChange, onStartup, onStreamStart } from '~/decorators/on';
import Service from './_interface';

import { google, youtube_v3 } from 'googleapis';
import { error, info } from '~/helpers/log';

import { OAuth2Client } from 'google-auth-library/build/src/auth/oauth2client';
import { MINUTE } from '@sogebot/ui-helpers/constants';

import {
  stats,
} from '~/helpers/api';
import { settings } from '~/decorators';

class Google extends Service {
  @settings()
    clientId = '';
  @settings()
    refreshToken = '';
  @settings()
    channel = '';

  expiryDate: null | number = null;
  accessToken: null | string = null;
  client: OAuth2Client | null = null;

  onStartupInterval: null | NodeJS.Timer = null;
  chatInterval: null | NodeJS.Timer = null;

  nextChatCheckAt = Date.now();
  lastMessageProcessedAt = new Date().toISOString();

  @onChange('refreshToken')
  @onChange('clientId')
  @onStartup()
  async onStartup() {
    if (this.refreshToken.length === 0 || this.clientId.length === 0) {
      return;
    }

    if (this.client) {
      this.client = null;
    }

    // configure a JWT auth client
    this.client = new google.auth.OAuth2({
      clientId: this.clientId,
    });
    this.client.setCredentials({
      access_token:  this.accessToken,
      refresh_token: this.refreshToken,
      expiry_date:   this.expiryDate,
    });

    this.client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        this.refreshToken = tokens.refresh_token;
      }
      if (tokens.access_token) {
        this.accessToken = tokens.access_token;
      }
      if (tokens.expiry_date) {
        this.expiryDate = tokens.expiry_date;
      }
    });

    const youtube = google.youtube({
      auth:    this.client,
      version: 'v3',
    });

    const channel = await youtube.channels.list({
      part: ['snippet,contentDetails'],
      mine: true,
    });
    if (channel.data.items && channel.data.items.length > 0) {
      const item = channel.data.items[0].snippet!;
      this.channel = [channel.data.items[0].id, item.title, item.customUrl].filter(String).join(' | ');
      info(`YOUTUBE: Authentication to Google Service successful as ${this.channel}.`);

      if (this.onStartupInterval) {
        clearInterval(this.onStartupInterval);
      }
      this.onStartupInterval = setInterval(async () => {
        const stream = await this.getStream();

        if (stream && stream.snippet) {
          const currentTitle = stats.value.currentTitle || 'n/a';
          if (stream.snippet.title !== currentTitle) {
            info(`YOUTUBE: Title is not matching current title, changing by bot to "${currentTitle}"`);
            await this.updateTitle(stream, currentTitle);
          }
        }
      }, MINUTE);
    } else {
      error(`'YOUTUBE: Couldn't get channel informations.`);
    }
  }

  async updateTitle(stream: youtube_v3.Schema$LiveBroadcast, title: string) {
    if (this.client) {
      const youtube = google.youtube({
        auth:    this.client,
        version: 'v3',
      });

      // get active broadcasts
      await youtube.liveBroadcasts.update({
        part:        ['id','snippet','contentDetails','status'],
        requestBody: {
          ...stream,
          snippet: {
            ...stream.snippet,
            title,
          },
        },
      });
    }
  }

  async getStream() {
    if (this.client) {
      const youtube = google.youtube({
        auth:    this.client,
        version: 'v3',
      });

      // get active broadcasts
      const list = await youtube.liveBroadcasts.list({
        part:            ['id','snippet','contentDetails','status'],
        broadcastStatus: 'active',
      });

      if (list.data.items && list.data.items.length > 0) {
        const stream = list.data.items[0];
        return stream;
      }
    }
    return null;
  }

  @onStreamStart()
  onStreamStart() {
    // we want to create new stream, private for now for archive purpose
    if (this.client) {
      const youtube = google.youtube({
        auth:    this.client,
        version: 'v3',
      });
      youtube.liveBroadcasts.insert({
        part:        ['id','snippet','contentDetails','status'],
        requestBody: {
          snippet: {
            title:              stats.value.currentTitle || 'n/a',
            scheduledStartTime: new Date(Date.now() + 60000).toISOString(),
          },
          status: {
            privacyStatus: 'private',
          },
          contentDetails: {
            enableAutoStart: true,
            enableAutoStop:  true,
          },
        },
      })
        .then(liveBroadcastResponse => info(`YOUTUBE: Created new private broadcast ${liveBroadcastResponse.data.id}`))
        .catch(e => error(`YOUTUBE: Something went wrong:\n${e}`));
    }
  }

  sockets() {
    if (!app) {
      setTimeout(() => this.sockets(), 100);
      return;
    }

    app.get('/api/services/google/privatekeys', adminMiddleware, async (req, res) => {
      res.send({
        data: await getRepository(GooglePrivateKeys).find(),
      });
    });

    app.post('/api/services/google/privatekeys', adminMiddleware, async (req, res) => {
      const data = req.body;
      await getRepository(GooglePrivateKeys).save(data);
      res.send({ data });
    });

    app.delete('/api/services/google/privatekeys/:id', adminMiddleware, async (req, res) => {
      await getRepository(GooglePrivateKeys).delete({ id: req.params.id });
      res.status(404).send();
    });
  }
}

export default new Google();
