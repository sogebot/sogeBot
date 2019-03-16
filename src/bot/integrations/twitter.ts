// 3rdparty libraries
import chalk from 'chalk';
import * as _ from 'lodash';
import Client from 'twitter';
import { isMainThread } from 'worker_threads';
import * as Message from '../message';

// bot libraries
import Integration from './_interface';

class Twitter extends Integration {
  [x: string]: any; // TODO: remove after interface ported to TS
  public watchedStreams: Array<{
    hash: string,
    stream: any,
  }>;

  constructor() {
    const options: InterfaceSettings = {
      settings: {
        tokens: {
          consumerKey: '',
          consumerSecret: '',
          accessToken: '',
          secretToken: '',
        },
      },
      ui: {
        tokens: {
          consumerKey: {
            type: 'text-input',
            secret: true,
          },
          consumerSecret: {
            type: 'text-input',
            secret: true,
          },
          accessToken: {
            type: 'text-input',
            secret: true,
          },
          secretToken: {
            type: 'text-input',
            secret: true,
          },
        },
      },
      on: {
        change: {
          enabled: ['onStateChange'],
        },
      },
    };

    super(options);

    this.client = null;
    this.watchedStreams = [];

    if (isMainThread) {
      this.addEvent();
    }
  }

  public addEvent() {
    if (typeof global.events === 'undefined') {
      setTimeout(() => this.addEvent(), 1000);
    } else {
      global.events.supportedEventsList.push(
        { id: 'tweet-post-with-hashtag', variables: [ 'tweet.message', 'tweet.username' ], definitions: { hashtag: '' } },
      );
      global.events.supportedOperationsList.push(
        { id: 'send-twitter-message', definitions: { messageToSend: '' }, fire: this.fireSendTwitterMessage },
      );
    }
  }

  public async fireSendTwitterMessage(operation: Events.OperationDefinitions, attributes: Events.Attributes): Promise<boolean> {
    attributes.username = _.get(attributes, 'username', global.commons.getOwner());
    let message = String(operation.messageToSend);
    for (const [val, name] of Object.entries(attributes)) {
      if (_.isObject(val) && _.size(val) === 0) {
        return true; // skip empty object
      }
      const replace = new RegExp(`\\$${name}`, 'g');
      message = message.replace(replace, val);
    }
    message = await new Message(message).parse();
    global.integrations.twitter.send(message);
    return true;
  }

  public send(text: string): void {
    if (!isMainThread) {
      global.workers.sendToMaster({ type: 'call', ns: 'integrations.twitter', fnc: 'send', args: [text] });
      return;
    }
    if (this.client === null) {
      throw new Error('Twitter integration is not connected');
    }
    this.client.post('statuses/update', { status: text }, (error, tweet, response) => {
      if (error) {
        global.log.error(error, 'Twitch#send');
      }
    });
  }

  public async enableStreamForHash(hash: string): Promise<void> {
    if (!this.watchedStreams.find((o) => o.hash === hash)) {
      this.client.stream('statuses/filter', {track: hash}, (stream) => {
        this.watchedStreams.push({ hash, stream });
        stream.on('data', (tweet) => {
          console.log({tweet});
        });

        stream.on('error', (error) => {
          console.log(error);
        });
      });
    }
  }

  public async disableStreamForHash(hash: string) {
    const stream = this.watchedStreams.find((o) => o.hash === hash);
    if (stream) {
      stream.stream.destroy();
    }
    this.watchedStreams = this.watchedStreams.filter((o) => o.hash !== hash);
  }

  private onStateChange(key: string, value: string) {
    if (value) {
      this.connect();
    } else {
      this.disconnect();
    }
  }

  private disconnect() {
    this.client = null;
    global.log.info(chalk.yellow('TWITTER: ') + 'Client disconnected from service');
  }

  private connect() {
    try {
      const error: string[] = [];
      if (this.settings.tokens.consumerKey.trim().length === 0) { error.push('consumerKey'); }
      if (this.settings.tokens.consumerSecret.trim().length === 0) { error.push('consumerSecret'); }
      if (this.settings.tokens.accessToken.trim().length === 0) { error.push('accessToken'); }
      if (this.settings.tokens.secretToken.trim().length === 0) { error.push('secretToken'); }
      if (error.length > 0) { throw new Error(error.join(', ') + 'missing'); }

      this.client = new Client({
        consumer_key: this.settings.tokens.consumerKey.trim(),
        consumer_secret: this.settings.tokens.consumerSecret.trim(),
        access_token_key: this.settings.tokens.accessToken.trim(),
        access_token_secret: this.settings.tokens.secretToken.trim(),
      });
      global.log.info(chalk.yellow('TWITTER: ') + 'Client connected to service');
    } catch (e) {
      global.log.info(chalk.yellow('TWITTER: ') + e.message);
    }
  }
}

module.exports = new Twitter();
