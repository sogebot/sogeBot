import { randomUUID } from 'node:crypto';

import { OAuth2Client } from 'google-auth-library/build/src/auth/oauth2client';
import { google, youtube_v3 } from 'googleapis';
import { TubeChat } from 'tubechat';

import Service from './_interface.js';

import { GooglePrivateKeys } from '~/database/entity/google.js';
import { AppDataSource } from '~/database.js';
import { onChange, onLoad, onStartup, onStreamEnd, onStreamStart } from '~/decorators/on.js';
import { persistent, settings } from '~/decorators.js';
import {
  isStreamOnline,
  stats,
  streamStatusChangeSince,
} from '~/helpers/api/index.js';
import { MINUTE } from '~/helpers/constants.js';
import { getTime } from '~/helpers/getTime.js';
import { getLang } from '~/helpers/locales.js';
import { error, info, debug, chatIn } from '~/helpers/log.js';
import { app, ioServer } from '~/helpers/panel.js';
import { parseTextWithEmotes } from '~/helpers/parseTextWithEmotes.js';
import { adminEndpoint } from '~/helpers/socket.js';
import { adminMiddleware } from '~/socket.js';

const tubeChat = new TubeChat();

class Google extends Service {
  clientId = '225380804535-gjd77dplfkbe4d3ct173d8qm0j83f8tr.apps.googleusercontent.com';
  @persistent()
    refreshToken = '';
  @settings()
    channel = '';
  @settings()
    streamId = '';

  @settings()
    onStreamEndTitle = 'Archive | $gamesList | $date';
  @settings()
    onStreamEndTitleEnabled = false;

  @settings()
    onStreamEndDescription = 'Streamed at https://twitch.tv/changeme\nTitle: $title\n\n=========\n$chapters\n========\n\nDate: $date';
  @settings()
    onStreamEndDescriptionEnabled = false;

  @settings()
    onStreamStartPrivacyStatus: 'private' | 'public' | 'unlisted' = 'public';

  @settings()
    onStreamEndPrivacyStatus: 'private' | 'public' | 'unlisted' = 'private';
  @settings()
    onStreamEndPrivacyStatusEnabled = false;

  expiryDate: null | number = null;
  accessToken: null | string = null;
  client: OAuth2Client | null = null;

  broadcastId: string | null = null;
  gamesPlayedOnStream: { game: string, timeMark: string }[] = [];
  broadcastStartedAt: string = new Date().toLocaleDateString(getLang());

  @onLoad('channel')
  @onChange('channel')
  async onStartupAndAccountChange() {
    tubeChat.channelList().forEach(channel => tubeChat.disconnect(channel.user));
    tubeChat.removeAllListeners();

    if (this.channel.length === 0) {
      return; // do nothing if channel is not set
    }

    const customUrl = this.channel.split('|')[2]?.trim().replace('@', '');
    // todo: get account id from oauth, also we gett broadcaster ID from channel connected, no need for polling
    info(`YOUTUBE: Starting chat listener for ${customUrl.replace('@', '')}`);
    tubeChat.connect(customUrl.replace('@', ''));

    tubeChat.on('chat_connected', (channel, videoId) => {
      // stream is live
      info(`YOUTUBE: ${channel} connected to chat for video ${videoId}`);
    });

    tubeChat.on('chat_disconnected', (channel, videoId) => {
      // stream is offline
      info(`YOUTUBE: ${channel} chat disconnected from video ${videoId}`);
    });

    tubeChat.on('message', async ({ badges, channel, channelId, color, id, isMembership, isModerator, isNewMember, isOwner, isVerified, message, name, thumbnail, timestamp }) => {
      chatIn(`@${channel}: ${message.map(item => {
        if (item.text || item.textEmoji) {
          return item.text || item.textEmoji;
        } else {
          return `[yt:emoji]`;
        }
      }).join('').trim()} [${name}]`);

      const messageJoined = message.map(item => {
        if (item.text || item.textEmoji) {
          return item.text || item.textEmoji;
        } else {
          return `[yt:emoji:${item.emoji}]`;
        }
      }).join('').trim();

      ioServer?.of('/overlays/chat').emit('message', {
        id:          randomUUID(),
        timestamp:   timestamp.getTime(),
        displayName: name,
        userName:    name,
        message:     await parseTextWithEmotes(messageJoined),
        show:        false,
        badges,
        color:       color,
        service:     'youtube',
      });
    });

    // todo: send events
    tubeChat.on('superchatSticker', (superchatSticker) => {});
    tubeChat.on('superchat', (superchat) => {});

    tubeChat.on('sub', (sub) => {});
    tubeChat.on('subGift', (subGift) => {});
    tubeChat.on('subgiftGroup', (subgiftGroup) => {});

    tubeChat.on('userReceiveSubGift', (userReceiveSubGift) => {});
  }

  @onStreamStart()
  async onStreamStart() {
    this.gamesPlayedOnStream = stats.value.currentGame ? [{ game: stats.value.currentGame, timeMark: '00:00:00' }] : [];
    this.broadcastStartedAt = new Date().toLocaleDateString(getLang());

    if (this.client && this.broadcastId) {
    // update privacy status
      const youtube = google.youtube({
        auth:    this.client,
        version: 'v3',
      });

      // load broadcast
      const list = await youtube.liveBroadcasts.list({
        part: ['id','snippet','contentDetails','status'],
        id:   [this.broadcastId],
      });

      let broadcast: youtube_v3.Schema$LiveBroadcast;
      if (list.data.items && list.data.items.length > 0) {
        broadcast = list.data.items[0];
      } else {
      // broadcast was not found
        return;
      }

      // get active broadcasts
      youtube.liveBroadcasts.update({
        part:        ['id','snippet','contentDetails','status'],
        requestBody: {
          ...broadcast,
          id:     this.broadcastId,
          status: {
            ...broadcast.status,
            privacyStatus: this.onStreamStartPrivacyStatus,
          },
        },
      });
    }
  }

  @onStreamEnd()
  async onStreamEnd() {
    if (this.client && this.broadcastId) {
      setTimeout(() => this.prepareBroadcast, 10000);
      const youtube = google.youtube({
        auth:    this.client,
        version: 'v3',
      });

      // load broadcast
      const list = await youtube.liveBroadcasts.list({
        part: ['id','snippet','contentDetails','status'],
        id:   [this.broadcastId],
      });

      let broadcast: youtube_v3.Schema$LiveBroadcast;
      if (list.data.items && list.data.items.length > 0) {
        broadcast = list.data.items[0];
      } else {
        // broadcast was not found
        return;
      }

      // get active broadcasts
      youtube.liveBroadcasts.update({
        part:        ['id','snippet','contentDetails','status'],
        requestBody: {
          ...broadcast,
          id:      this.broadcastId,
          snippet: {
            ...broadcast.snippet,
            title: this.onStreamEndTitleEnabled
              ? this.onStreamEndTitle
                .replace('$gamesList', Array.from(new Set(this.gamesPlayedOnStream.map(item => item.game))).join(', '))
                .replace('$title', stats.value.currentTitle || '')
                .replace('$date', this.broadcastStartedAt)
              : broadcast.snippet?.title,
            description: this.onStreamEndDescriptionEnabled
              ? this.onStreamEndDescription
                .replace('$chapters', this.gamesPlayedOnStream
                  .map(item => `${item.timeMark} ${item.game}`)
                  .join('\n'))
                .replace('$title', broadcast.snippet?.title || stats.value.currentTitle || '')
                .replace('$date', this.broadcastStartedAt)
              : broadcast.snippet?.description,
          },
          status: {
            ...broadcast.status,
            privacyStatus: this.onStreamEndPrivacyStatusEnabled
              ? this.onStreamEndPrivacyStatus
              : broadcast.status?.privacyStatus,
          },
        },
      });
    }
  }

  @onStartup()
  startIntervals() {
    setInterval(async () => {
      const stream = await this.getBroadcast();

      if (stream && stream.snippet) {
        const currentTags = (stats.value.currentTags || []).map(o => `#${o}`).join(' ');
        const currentTitle = [(stats.value.currentTitle || 'n/a') + ` | ${stats.value.currentGame ?? 'n/a'}`, currentTags].filter(String).join(' | ');

        if (stream.snippet.title !== currentTitle && isStreamOnline.value) {
          info(`YOUTUBE: Title is not matching current title, changing by bot to "${currentTitle}"`);
          await this.updateTitle(stream, currentTitle);
        }
      }

      // add game to list
      if (stats.value.currentGame
        && (this.gamesPlayedOnStream.length > 0 && this.gamesPlayedOnStream[this.gamesPlayedOnStream.length - 1].game !== stats.value.currentGame)) {
        info(`YOTUBE: Game changed to ${stats.value.currentGame} at ${Date.now() - streamStatusChangeSince.value}`);
        this.gamesPlayedOnStream.push({
          game:     stats.value.currentGame,
          timeMark: getTime(streamStatusChangeSince.value, false) as string,
        });
      }
    }, MINUTE);

    setInterval(async () => {
      const broadcast = await this.getBroadcast();

      if (!broadcast) {
        this.prepareBroadcast();
      }
    }, 15 * MINUTE);
  }

  @onChange('refreshToken')
  @onStartup()
  async onStartup() {
    debug('google', `Refresh token changed to: ${this.refreshToken}`);
    if (this.refreshToken.length === 0) {
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

  async getBroadcast() {
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
        const broadcast = list.data.items[0];
        this.broadcastId = broadcast.id ?? null;
        return broadcast;
      }
    }
    return null;
  }

  async prepareBroadcast() {
    if (isStreamOnline.value || this.refreshToken === '') {
      return; // do nothing if already streaming
    }
    // we want to create new stream, private for now for archive purpose
    if (this.client) {
      const youtube = google.youtube({
        auth:    this.client,
        version: 'v3',
      });

      // get active broadcasts
      const list = await youtube.liveBroadcasts.list({
        part:            ['id','snippet','contentDetails','status'],
        broadcastStatus: 'upcoming',
      });

      if (list.data.items && list.data.items.length > 0) {
        const broadcast = list.data.items[0];

        this.broadcastId = broadcast.id ?? null;

        if (this.streamId.length > 0 && broadcast.id) {
          await youtube.liveBroadcasts.bind({
            part:     ['id'],
            streamId: this.streamId,
            id:       broadcast.id,
          });
        }

        // if have broadcast, update scheduledStartTime
        return youtube.liveBroadcasts.update({
          part:        ['id','snippet','contentDetails','status'],
          requestBody: {
            ...broadcast,
            snippet: {
              ...broadcast.snippet,
              title:              stats.value.currentTitle || 'n/a',
              scheduledStartTime: new Date(Date.now() + (15 * 60000)).toISOString(),
            },
          },
        });
      }

      youtube.liveBroadcasts.insert({
        part:        ['id','snippet','contentDetails','status'],
        requestBody: {
          snippet: {
            title:              stats.value.currentTitle || 'n/a',
            scheduledStartTime: new Date(Date.now() + (15 * 60000)).toISOString(),
          },
          status: {
            privacyStatus:           'private',
            selfDeclaredMadeForKids: false,
          },
          contentDetails: {
            enableAutoStart: true,
            enableAutoStop:  true,
          },
        },
      })
        .then(liveBroadcastResponse => {
          if (this.streamId.length > 0 && liveBroadcastResponse.data.id) {
            youtube.liveBroadcasts.bind({
              part:     ['id'],
              streamId: this.streamId,
              id:       liveBroadcastResponse.data.id,
            });
          }
          info(`YOUTUBE: Created new private broadcast ${liveBroadcastResponse.data.id}`);
        })
        .catch(e => {
          error(`YOUTUBE: Something went wrong:\n${e}`);
        });
    }
  }

  sockets() {
    if (!app) {
      setTimeout(() => this.sockets(), 100);
      return;
    }

    adminEndpoint('/services/google', 'google::revoke', async (cb) => {
      self.channel = '';
      self.refreshToken = '';
      info(`YOUTUBE: User access revoked.`);
      cb(null);
    });
    adminEndpoint('/services/google', 'google::token', async (tokens, cb) => {
      self.refreshToken = tokens.refreshToken;
      cb(null);
    });

    app.get('/api/services/google/privatekeys', adminMiddleware, async (req, res) => {
      res.send({
        data: await AppDataSource.getRepository(GooglePrivateKeys).find(),
      });
    });

    app.post('/api/services/google/privatekeys', adminMiddleware, async (req, res) => {
      const data = req.body;
      await AppDataSource.getRepository(GooglePrivateKeys).save(data);
      res.send({ data });
    });

    app.delete('/api/services/google/privatekeys/:id', adminMiddleware, async (req, res) => {
      await AppDataSource.getRepository(GooglePrivateKeys).delete({ id: req.params.id });
      res.status(404).send();
    });

    app.get('/api/services/google/streams', adminMiddleware, async (req, res) => {
      if (this.client) {
        const youtube = google.youtube({
          auth:    this.client,
          version: 'v3',
        });

        const rmtps = await youtube.liveStreams.list({
          part: ['id', 'snippet', 'cdn', 'status'],
          mine: true,
        });
        res.send({ data: rmtps.data.items });
      } else {
        res.send({ data: [] });
      }
    });
  }
}
const self = new Google();
export default self;
