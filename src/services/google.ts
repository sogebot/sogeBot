import { randomUUID } from 'node:crypto';

import { GaxiosError } from 'gaxios';
import { OAuth2Client } from 'google-auth-library/build/src/auth/oauth2client';
import { google, youtube_v3 } from 'googleapis';
import { TubeChat } from 'tubechat';
import { ISuperChatSticker, ISuperChat } from 'tubechat/lib/lib/actions/superchat.js';

import Service from './_interface.js';
import eventlist from '../overlays/eventlist.js';
import alerts from '../registries/alerts.js';

import { GooglePrivateKeys } from '~/database/entity/google.js';
import { Currency } from '~/database/entity/user.js';
import { AppDataSource } from '~/database.js';
import { onChange, onLoad, onStartup, onStreamEnd, onStreamStart } from '~/decorators/on.js';
import { persistent, settings } from '~/decorators.js';
import {
  isStreamOnline,
  stats,
  streamStatusChangeSince,
} from '~/helpers/api/index.js';
import { MINUTE } from '~/helpers/constants.js';
import exchange from '~/helpers/currency/exchange.js';
import { mainCurrency } from '~/helpers/currency/index.js';
import { eventEmitter } from '~/helpers/events/index.js';
import { getTime } from '~/helpers/getTime.js';
import { triggerInterfaceOnTip } from '~/helpers/interface/triggers.js';
import { getLang } from '~/helpers/locales.js';
import { error, info, debug, chatIn } from '~/helpers/log.js';
import { app, ioServer } from '~/helpers/panel.js';
import { parseTextWithEmotes } from '~/helpers/parseTextWithEmotes.js';
import { adminEndpoint } from '~/helpers/socket.js';
import { adminMiddleware } from '~/socket.js';

const tubeChat = new TubeChat();

let titleChangeRequestRetry = 0;

class Google extends Service {
  clientId = '225380804535-gjd77dplfkbe4d3ct173d8qm0j83f8tr.apps.googleusercontent.com';
  @persistent()
    refreshToken = '';
  @settings()
    channel = '';
  @settings()
    streamId = '';

  @settings()
    shouldPrepareBroadcast = false;

  @settings()
    onStreamTitle = '$title | $game';
  @settings()
    onStreamDescription = 'Streaming at https://twitch.tv/changeme\n\n=========\n$chapters\n========\n\n$tags';

  @settings()
    onStreamEndTitle = 'Archive | $gamesList | $date';
  @settings()
    onStreamEndTitleEnabled = false;

  @settings()
    onStreamEndDescription = 'Streamed at https://twitch.tv/changeme\nTitle: $title\n\n=========\n$chapters\n========\n\nDate: $date\n\n$tags';
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

  gamesPlayedOnStream: { game: string, timeMark: string }[] = [];
  broadcastStartedAt: string = new Date().toLocaleDateString(getLang());

  async receivedSuperChat(data: ISuperChatSticker | ISuperChat ) {
    const username = data.name;
    const amount = data.amount;
    const message = data.message.map(val => val.text || val.textEmoji).join('');
    const currency = data.currency.toUpperCase() as Currency; // in lower case usually

    if (isStreamOnline.value) {
      stats.value.currentTips = stats.value.currentTips + exchange(amount, currency, mainCurrency.value);
    }

    const eventData = await eventlist.add({
      event:     'tip',
      amount,
      currency,
      userId:    `${username}#__anonymous__`,
      message,
      timestamp: Date.now(),
    });

    eventEmitter.emit('tip', {
      userName:            username.toLowerCase(),
      amount:              Number(amount).toFixed(2),
      currency:            currency,
      amountInBotCurrency: Number(exchange(amount, currency, mainCurrency.value)).toFixed(2),
      currencyInBot:       mainCurrency.value,
      message,
      isAnonymous:         true,
    });
    alerts.trigger({
      eventId:    eventData?.id ?? null,
      event:      'tip',
      service:    'YouTube SuperChat',
      name:       username.toLowerCase(),
      amount:     Number(Number(amount).toFixed(2)),
      tier:       null,
      currency:   currency,
      monthsName: '',
      message,
    });

    triggerInterfaceOnTip({
      userName:  username.toLowerCase(),
      amount,
      message,
      currency:  currency,
      timestamp: Date.now(),
    });
  }

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

    tubeChat.on('superchatSticker', (superchatSticker) => {
      this.receivedSuperChat(superchatSticker);
    });
    tubeChat.on('superchat', (superchat) => {
      this.receivedSuperChat(superchat);
    });

    // todo: send events
    tubeChat.on('sub', (sub) => {});
    tubeChat.on('subGift', (subGift) => {});
    tubeChat.on('subgiftGroup', (subgiftGroup) => {});

    tubeChat.on('userReceiveSubGift', (userReceiveSubGift) => {});
  }

  @onStreamStart()
  async onStreamStart() {
    this.gamesPlayedOnStream = stats.value.currentGame ? [{ game: stats.value.currentGame, timeMark: '00:00:00' }] : [];
    this.broadcastStartedAt = new Date().toLocaleDateString(getLang());

    const broadcast = await this.getBroadcast();

    if (this.client && broadcast) {
    // update privacy status
      const youtube = google.youtube({
        auth:    this.client,
        version: 'v3',
      });

      // get active broadcasts
      youtube.liveBroadcasts.update({
        part:        ['id','snippet','contentDetails','status'],
        requestBody: {
          ...broadcast,
          id:     broadcast.id,
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
    const broadcast = await this.getBroadcast();

    if (this.client && broadcast) {
      setTimeout(() => this.prepareBroadcast(), 10000);
      const youtube = google.youtube({
        auth:    this.client,
        version: 'v3',
      });

      info(`YOUTUBE: Stream ended, updating title, description and privacy status of the broadcast ${broadcast.id}.`);
      // get active broadcasts
      youtube.liveBroadcasts.update({
        part:        ['id','snippet','contentDetails','status'],
        requestBody: {
          ...broadcast,
          id:      broadcast.id,
          snippet: {
            ...broadcast.snippet,
            title: this.onStreamEndTitleEnabled
              ? this.onStreamEndTitle
                .replace('$gamesList', Array.from(new Set(this.gamesPlayedOnStream.map(item => item.game))).join(', '))
                .replace('$title', stats.value.currentTitle || '')
                .replace('$date', this.broadcastStartedAt)
                .slice(0, 100) // max 100 chars
              : broadcast.snippet?.title,
            description: this.onStreamEndDescriptionEnabled
              ? this.onStreamEndDescription
                .replace('$chapters', this.gamesPlayedOnStream
                  .map(item => `${item.timeMark} ${item.game}`)
                  .join('\n'))
                .replace('$title', broadcast.snippet?.title || stats.value.currentTitle || '')
                .replace('$date', this.broadcastStartedAt)
                .replace('$tags', (stats.value.currentTags || []).map(o => `#${o}`).join(' '))
                .slice(0, 5000) // max 5000 chars
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
      if (!isStreamOnline.value) {
        return;
      }
      const stream = await this.getBroadcast();

      if (stream && stream.snippet) {
        const currentTags = (stats.value.currentTags || []).map(o => `#${o}`).join(' ');
        const currentTitle = [(stats.value.currentTitle || 'n/a') + ` | ${stats.value.currentGame ?? 'n/a'}`, currentTags].filter(String).join(' | ');

        const title = this.onStreamTitle
          .replace('$game', stats.value.currentGame || 'n/a')
          .replace('$title', stats.value.currentTitle || 'n/a')
          .replace('$tags', currentTags)
          .slice(0, 100); // max 100 chars
        const description = this.onStreamDescription
          .replace('$game', stats.value.currentGame || 'n/a')
          .replace('$title', stats.value.currentTitle || 'n/a')
          .replace('$tags', currentTags)
          .replace('$chapters', this.gamesPlayedOnStream
            .map(item => `${item.timeMark} ${item.game}`)
            .join('\n'))
          .slice(0, 5000); // max 5000 chars

        if (stream.snippet.title !== title && isStreamOnline.value) {
          if (titleChangeRequestRetry < 5) {
            if (titleChangeRequestRetry === 0) {
              info(`YOUTUBE: Title is not matching current title, changing by bot to "${title}"`);
            } else {
              info(`YOUTUBE: Title is not matching current title, retrying (${titleChangeRequestRetry}) to change to "${currentTitle}"`);
            }
            try {
              await this.updateTitle(stream, title, description);
              titleChangeRequestRetry = 0;
            } catch (e) {
              titleChangeRequestRetry++;
              error(`YOUTUBE: Failed to change title:\n${e}`);
            }
          }
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
    }, 5 * MINUTE);

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

    try {
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
    } catch (e) {
      error(`'YOUTUBE: Something went wrong:\n${e}`);
    }
  }

  async updateTitle(stream: youtube_v3.Schema$LiveBroadcast, title: string, description: string) {
    const youtube = this.getYoutube();
    if (youtube) {
      // get active broadcasts
      await youtube.liveBroadcasts.update({
        part:        ['id','snippet','contentDetails','status'],
        requestBody: {
          ...stream,
          snippet: {
            ...stream.snippet,
            title,
            description,
          },
        },
      });
    }
  }

  getYoutube() {
    try {
      if (this.client) {
        return google.youtube({
          auth:    this.client,
          version: 'v3',
        });
      } else {
        return null;
      }
    } catch (e) {
      if (e instanceof GaxiosError) {
        error(`YOUTUBE: getYoutube() GaxiosError - ${e.code} - ${e.stack} - ${e.message} - `);
        error(`YOUTUBE: ${JSON.stringify(e.response)}`);
      } else {
        error(`YOUTUBE: Failed to get youtube client:\n${e}`);
      }
      this.client = null;
    }
  }

  async getBroadcast() {
    const youtube = this.getYoutube();
    if (youtube) {
      // get active broadcasts
      const list = await youtube.liveBroadcasts.list({
        part:            ['id','snippet','contentDetails','status'],
        broadcastStatus: 'active',
      });

      if (list.data.items && list.data.items.length > 0) {
        const broadcast = list.data.items[0];
        return broadcast;
      }
    }
    return null;
  }

  async prepareBroadcast() {
    if (isStreamOnline.value || this.refreshToken === '' || this.shouldPrepareBroadcast === false) {
      return; // do nothing if already streaming
    }
    const youtube = this.getYoutube();
    // we want to create new stream, private for now for archive purpose
    if (youtube) {
      // get active broadcasts
      const list = await youtube.liveBroadcasts.list({
        part:            ['id','snippet','contentDetails','status'],
        broadcastStatus: 'upcoming',
      });

      if (list.data.items && list.data.items.length > 0) {
        const broadcast = list.data.items[0];

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
      const youtube = this.getYoutube();
      if (youtube) {
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
