import axios from 'axios';
import _ from 'lodash-es';
import { v4 } from 'uuid';

import {
  operation, command, count, custom, evaluate, ifp, info, list, math, online, param, price, qs, random, ResponseFilter, stream, youtube,
} from './filters/index.js';
import getBotId from './helpers/user/getBotId.js';
import getBotUserName from './helpers/user/getBotUserName.js';

import { timer } from '~/decorators.js';
import { getGlobalVariables } from '~/helpers/checkFilter.js';
import { getUserSender } from '~/helpers/commons/index.js';
import { app } from '~/helpers/panel.js';
import twitch from '~/services/twitch.js';
import { adminMiddleware } from '~/socket.js';
import { translate } from '~/translate.js';

(function initializeMessageParserAPI() {
  if (!app) {
    setTimeout(() => initializeMessageParserAPI(), 100);
    return;
  }

  app.post('/api/core/parse', adminMiddleware, async (req, res) => {
    try {
      const text = await new Message(req.body.message).parse({ sender: getUserSender(req.body.user.id, req.body.user.username), discord: undefined }) as string;
      res.send({ data: text });
    } catch (e) {
      res.status(400).send({ errors: e });
    }
  });
})();

export class Message {
  message = '';
  id = v4();

  constructor (message: string) {
    this.message = message;
  }

  @timer()
  async global (opts: { escape?: string, sender?: CommandOptions['sender'], discord?: CommandOptions['discord'] }) {
    if (!this.message.includes('$')) {
      // message doesn't have any variables
      return this.message;
    }

    const variables = await getGlobalVariables(this.message, opts);
    for (const variable of Object.keys(variables)) {
      this.message = this.message.replaceAll(variable, String(variables[variable as keyof typeof variables] ?? ''));
    }

    return this.message;
  }

  @timer()
  async parse (attr: { [name: string]: any, isFilter?: boolean, sender: CommandOptions['sender'], discord: CommandOptions['discord'], forceWithoutAt?: boolean } = { sender: getUserSender(getBotId(), getBotUserName()), discord: undefined, isFilter: false }) {
    this.message = await this.message; // if is promise

    if (!attr.isFilter) {
      await this.global({ sender: attr.sender, discord: attr.discord  });
      // local replaces
      if (!_.isNil(attr)) {
        for (let [key, value] of Object.entries(attr)) {
          if (key === 'sender') {
            if (typeof value.userName !== 'undefined') {
              value = twitch.showWithAt && attr.forceWithoutAt !== true ? `@${value.userName}` : value.userName;
            } else {
              value = twitch.showWithAt && attr.forceWithoutAt !== true ? `@${value}` : value;
            }
          }
          this.message = this.message.replace(new RegExp('[$]' + key, 'g'), value);
        }
      }
      await this.parseMessageEach(param, attr, true);
    }

    await this.parseMessageEach(price, attr);
    await this.parseMessageEach(info, attr);
    await this.parseMessageEach(youtube, attr);
    await this.parseMessageEach(random, attr);
    await this.parseMessageEach(ifp, attr, false);
    if (attr.replaceCustomVariables || typeof attr.replaceCustomVariables === 'undefined') {
      await this.parseMessageVariables(custom, attr);
    }
    await this.parseMessageEach(math, attr);
    await this.parseMessageOnline(online, attr);
    await this.parseMessageCommand(command, attr);
    await this.parseMessageEach(qs, attr, false);
    await this.parseMessageEach(list, attr);
    await this.parseMessageEach(stream, attr, true, '$\\@\\w0-9');
    await this.parseMessageEach(count, attr);
    await this.parseMessageEach(operation, attr, false);
    await this.parseMessageEval(evaluate, attr);
    await this.parseMessageApi();

    return this.message;
  }

  @timer()
  async parseMessageApi () {
    if (this.message.trim().length === 0) {
      return;
    }

    const rMessage = this.message.match(/\(api\|(http\S+)\)/i);
    if (!_.isNil(rMessage) && !_.isNil(rMessage[1])) {
      this.message = this.message.replace(rMessage[0], '').trim(); // remove api command from message
      const url = rMessage[1].replace(/&amp;/g, '&');
      const response = await axios.get<any>(url);
      if (response.status !== 200) {
        return translate('core.api.error');
      }

      // search for api datas in this.message
      const rData = this.message.match(/\(api\.(?!_response)(\S*?)\)/gi);
      if (_.isNil(rData)) {
        if (_.isObject(response.data)) {
          // Stringify object
          this.message = this.message.replace('(api._response)', JSON.stringify(response.data));
        } else {
          this.message = this.message.replace('(api._response)', response.data.toString().replace(/^"(.*)"/, '$1'));
        }
      } else {
        if (_.isBuffer(response.data)) {
          response.data = JSON.parse(response.data.toString());
        }
        for (const tag of rData) {
          let path = response.data;
          const ids = tag.replace('(api.', '').replace(')', '').split('.');
          _.each(ids, function (id) {
            const isArray = id.match(/(\S+)\[(\d+)\]/i);
            if (isArray) {
              path = path[isArray[1]][isArray[2]];
            } else {
              path = path[id];
            }
          });
          this.message = this.message.replace(tag, !_.isNil(path) ? path : translate('core.api.not-available'));
        }
      }
    }
  }

  @timer()
  async parseMessageCommand (filters: ResponseFilter, attr: Parameters<ResponseFilter[string]>[1]) {
    if (this.message.trim().length === 0) {
      return;
    }
    for (const key in filters) {
      const fnc = filters[key];
      let regexp = _.escapeRegExp(key);

      // we want to handle # as \w - number in regexp
      regexp = regexp.replace(/#/g, '.*?');
      const rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')));
      if (rMessage !== null) {
        for (const bkey in rMessage) {
          this.message = this.message.replace(rMessage[bkey], await fnc(rMessage[bkey], { ..._.cloneDeep(attr), sender: attr.sender })).trim();
        }
      }
    }
  }

  @timer()
  async parseMessageOnline (filters: ResponseFilter, attr: Parameters<ResponseFilter[string]>[1]) {
    if (this.message.trim().length === 0) {
      return;
    }
    for (const key in filters) {
      const fnc = filters[key];
      let regexp = _.escapeRegExp(key);

      // we want to handle # as \w - number in regexp
      regexp = regexp.replace(/#/g, '(\\S+)');
      const rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')));
      if (rMessage !== null) {
        for (const bkey in rMessage) {
          if (!(await fnc(rMessage[bkey], { ..._.cloneDeep(attr), sender: attr.sender }))) {
            this.message = '';
          } else {
            this.message = this.message.replace(rMessage[bkey], '').trim();
          }
        }
      }
    }
  }

  @timer()
  async parseMessageEval (filters: ResponseFilter, attr: Parameters<ResponseFilter[string]>[1]) {
    if (this.message.trim().length === 0) {
      return;
    }
    for (const key in filters) {
      const fnc = filters[key];
      let regexp = _.escapeRegExp(key);

      // we want to handle # as \w - number in regexp
      regexp = regexp.replace(/#/g, '([\\S ]+)');
      const rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')));
      if (rMessage !== null) {
        for (const bkey in rMessage) {
          const newString = await fnc(rMessage[bkey], { ..._.cloneDeep(attr), sender: attr.sender });
          if (_.isUndefined(newString) || newString.length === 0) {
            this.message = '';
          }
          this.message = this.message.replace(rMessage[bkey], newString).trim();
        }
      }
    }
  }

  @timer()
  async parseMessageVariables (filters: ResponseFilter, attr: Parameters<ResponseFilter[string]>[1], removeWhenEmpty = true) {
    if (this.message.trim().length === 0) {
      return;
    }
    for (const key in filters) {
      const fnc = filters[key];
      let regexp = _.escapeRegExp(key);

      regexp = regexp.replace(/#/g, '([a-zA-Z0-9_]+)');
      const rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')));
      if (rMessage !== null) {
        for (const bkey in rMessage) {
          const newString = await fnc(rMessage[bkey], { ..._.cloneDeep(attr), sender: attr.sender });
          if ((_.isNil(newString) || newString.length === 0) && removeWhenEmpty) {
            this.message = '';
          }
          this.message = this.message.replace(rMessage[bkey], newString).trim();
        }
      }
    }
  }

  @timer()
  async parseMessageEach (filters: ResponseFilter, attr: Parameters<ResponseFilter[string]>[1], removeWhenEmpty = true, regexpChar = '\\S') {
    if (this.message.trim().length === 0) {
      return;
    }
    for (const key in filters) {
      const fnc = filters[key];
      let regexp = _.escapeRegExp(key);

      if (key.startsWith('$')) {
        regexp = regexp.replace(/#/g, '(.+?)');
      } else {
        regexp = regexp.replace(/#/g, '([' + regexpChar + ' ]+?)'); // default behavior for if
      }
      const rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')));
      if (rMessage !== null) {
        for (const bkey in rMessage) {
          const newString = await fnc(rMessage[bkey], { ..._.cloneDeep(attr), sender: attr.sender });
          if ((_.isNil(newString) || newString.length === 0) && removeWhenEmpty) {
            this.message = '';
          }
          this.message = String(this.message.replace(rMessage[bkey], newString)).trim();
        }
      }
    }
  }
}
