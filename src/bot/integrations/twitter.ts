// 3rdparty libraries
import chalk from 'chalk';
import _ from 'lodash';
import Client from 'twitter';
import { isMainThread } from 'worker_threads';

// bot libraries
import { getOwner } from '../commons';
import Message from '../message';
import Integration from './_interface';
import { settings, ui } from '../decorators';
import { onChange, onStartup } from '../decorators/on';

class Twitter extends Integration {
  public watchedStreams: {
    hash: string;
    stream: any;
  }[] = [];
  public client: any = null;

  @settings('token')
  @ui({ type: 'text-input', secret: true })
  consumerKey: string = '';
  @settings('token')
  @ui({ type: 'text-input', secret: true })
  consumerSecret: string = '';
  @settings('token')
  @ui({ type: 'text-input', secret: true })
  accessToken: string = '';
  @settings('token')
  @ui({ type: 'text-input', secret: true })
  secretToken: string = '';

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
    if (typeof global.events === 'undefined') {
      setTimeout(() => this.addEvent(), 1000);
    } else {
      global.events.supportedEventsList.push(
        { id: 'tweet-post-with-hashtag', variables: [ 'tweet.text', 'tweet.username', 'tweet.displayname', 'tweet.url' ], definitions: { hashtag: '' }, check: this.eventHaveCorrectHashtag },
      );
      global.events.supportedOperationsList.push(
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
    global.integrations.twitter.send(message);
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
        global.log.info(chalk.yellow('TWITTER: ') + 'Stream for ' + hash + ' was started.');
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
          global.db.engine.insert(global.widgets.social.collection.data, data);
          global.events.fire('tweet-post-with-hashtag', { tweet: data });
        });

        stream.on('error', (error) => {
          global.log.error(chalk.yellow('TWITTER: ') + error);
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
    global.log.info(chalk.yellow('TWITTER: ') + 'Stream for ' + hash + ' was ended.');
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
    const events = await global.db.engine.find('events', { key: 'tweet-post-with-hashtag' });
    const hashtagsToWatch = events.map((o) => {
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
      this.enableStreamForHash(hash);
    }
  }

  private disconnect() {
    this.client = null;
    global.log.info(chalk.yellow('TWITTER: ') + 'Client disconnected from service');
  }

  private connect() {
    try {
      const error: string[] = [];
      if (this.consumerKey.trim().length === 0) { error.push('consumerKey'); }
      if (this.consumerSecret.trim().length === 0) { error.push('consumerSecret'); }
      if (this.accessToken.trim().length === 0) { error.push('accessToken'); }
      if (this.secretToken.trim().length === 0) { error.push('secretToken'); }
      if (error.length > 0) { throw new Error(error.join(', ') + 'missing'); }

      this.client = new Client({
        consumer_key: this.consumerKey.trim(),
        consumer_secret: this.consumerSecret.trim(),
        access_token_key: this.accessToken.trim(),
        access_token_secret: this.secretToken.trim(),
      });
      global.log.info(chalk.yellow('TWITTER: ') + 'Client connected to service');
    } catch (e) {
      global.log.info(chalk.yellow('TWITTER: ') + e.message);
    }
  }
}

export default Twitter;
export { Twitter };
