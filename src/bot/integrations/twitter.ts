// 3rdparty libraries
import chalk from 'chalk';
import _ from 'lodash';
import Client from 'twitter';
import { isMainThread } from '../cluster';

// bot libraries
import { getOwner } from '../commons';
import Message from '../message';
import Integration from './_interface';
import { settings, ui } from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import { info } from '../helpers/log';
import { getRepository } from 'typeorm';
import { Event } from '../database/entity/event';
import { WidgetSocial } from '../database/entity/widget';
import events from '../events';

class Twitter extends Integration {
  public watchedStreams: {
    hash: string;
    stream: any;
  }[] = [];
  public client: Client | null = null;

  @settings('token')
  @ui({ type: 'text-input', secret: true })
  consumerKey = '';
  @settings('token')
  @ui({ type: 'text-input', secret: true })
  consumerSecret = '';
  @settings('token')
  @ui({ type: 'text-input', secret: true })
  accessToken = '';
  @settings('token')
  @ui({ type: 'text-input', secret: true })
  secretToken = '';

  constructor() {
    super();

    if (isMainThread) {
      this.addEvent();
      setInterval(() => {
        this.updateStreams();
      }, 10000);
    }
  }

  public addEvent() {
    if (typeof events === 'undefined') {
      setTimeout(() => this.addEvent(), 1000);
    } else {
      events.supportedEventsList.push(
        { id: 'tweet-post-with-hashtag', variables: [ 'tweet.text', 'tweet.username', 'tweet.displayname', 'tweet.url' ], definitions: { hashtag: '' }, check: this.eventHaveCorrectHashtag },
      );
      events.supportedOperationsList.push(
        { id: 'send-twitter-message', definitions: { messageToSend: '' }, fire: this.fireSendTwitterMessage },
      );
    }
  }

  public async fireSendTwitterMessage(operation: Events.OperationDefinitions, attributes: Events.Attributes): Promise<void> {
    attributes.username = _.get(attributes, 'username', getOwner());
    let message = String(operation.messageToSend);
    for (const [val, name] of Object.entries(attributes)) {
      if (_.isObject(val) && _.size(val) === 0) {
        return; // skip empty object
      }
      const replace = new RegExp(`\\$${name}`, 'g');
      message = message.replace(replace, val);
    }
    message = await new Message(message).parse();
    self.send(message);
  }

  public send(text: string): void {
    if (this.client === null) {
      throw new Error('Twitter integration is not connected');
    }
    this.client.post('statuses/update', { status: text }, (error, tweet, response) => {
      if (error) {
        error(error, 'Twitch#send');
      }
    });
  }

  public async enableStreamForHash(hash: string): Promise<void> {
    if (!this.watchedStreams.find((o) => o.hash === hash)) {
      this.client?.stream('statuses/filter', {track: hash}, (stream) => {
        info(chalk.yellow('TWITTER: ') + 'Stream for ' + hash + ' was started.');
        this.watchedStreams.push({ hash, stream });
        stream.on('data', (tweet) => {
          const data = {
            id: tweet.id_str,
            type: 'twitter',
            timestamp: Date.now(),
            hashtag: hash,
            text: tweet.text,
            username: tweet.user.screen_name,
            displayname: tweet.user.name,
            url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
          };
          getRepository(WidgetSocial).save(data);
          events.fire('tweet-post-with-hashtag', { tweet: data });
        });

        stream.on('error', (error) => {
          error(chalk.yellow('TWITTER: ') + error);
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
    info(chalk.yellow('TWITTER: ') + 'Stream for ' + hash + ' was ended.');
  }

  @onStartup()
  @onChange('enabled')
  public onStateChange(key: string, value: boolean) {
    if (value) {
      this.connect();
    } else {
      this.disconnect();
    }
  }

  protected async eventHaveCorrectHashtag(event: any, attributes: Events.Attributes): Promise<boolean> {
    const shouldTrigger = event.definitions.hashtag === attributes.tweet.hashtag;
    return shouldTrigger;
  }

  protected async updateStreams() {
    if (this.client === null) {
      // do nothing if client is not defined
      return;
    }
    const hashtagsToWatch = (await getRepository(Event).find({ name: 'tweet-post-with-hashtag' })).map((o) => {
      return o.definitions.hashtag;
    });

    for (const s of this.watchedStreams) {
      if (hashtagsToWatch.includes(s.hash)) {
        // hash already added
        continue;
      } else {
        // hash is not in watchlist
        this.disableStreamForHash(s.hash);
      }
    }

    for (const hash of hashtagsToWatch) {
      // enable rest of hashed
      this.enableStreamForHash(hash as string);
    }
  }

  private disconnect() {
    this.client = null;
    info(chalk.yellow('TWITTER: ') + 'Client disconnected from service');
  }

  private connect() {
    try {
      const error: string[] = [];
      if (this.consumerKey.trim().length === 0) {
        error.push('consumerKey');
      }
      if (this.consumerSecret.trim().length === 0) {
        error.push('consumerSecret');
      }
      if (this.accessToken.trim().length === 0) {
        error.push('accessToken');
      }
      if (this.secretToken.trim().length === 0) {
        error.push('secretToken');
      }
      if (error.length > 0) {
        throw new Error(error.join(', ') + 'missing');
      }

      this.client = new Client({
        consumer_key: this.consumerKey.trim(),
        consumer_secret: this.consumerSecret.trim(),
        access_token_key: this.accessToken.trim(),
        access_token_secret: this.secretToken.trim(),
      });
      info(chalk.yellow('TWITTER: ') + 'Client connected to service');
    } catch (e) {
      info(chalk.yellow('TWITTER: ') + e.message);
    }
  }
}

const self = new Twitter();
export default self;
