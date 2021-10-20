import axios from 'axios';
import _ from 'lodash';
import { v4 } from 'uuid';

import tmi from './chat';
import { timer } from './decorators.js';
import {
  command, count, custom, evaluate, ifp, info, list, math, online, param, price, qs, random, ResponseFilter, stream, youtube,
} from './filters';
import { getGlobalVariables } from './helpers/checkFilter.js';
import { getBotSender } from './helpers/commons/getBotSender';
import { translate } from './translate';

class Message {
  message = '';
  id = v4();

  constructor (message: string) {
    this.message = message;
  }

  @timer()
  async global (opts: { escape?: string, sender?: CommandOptions['sender'] }) {
    if (!this.message.includes('$')) {
      // message doesn't have any variables
      return this.message;
    }

    const variables = await getGlobalVariables(this.message, opts);
    for (const variable of Object.keys(variables)) {
      const regexp = new RegExp(`\\${variable}`, 'g');
      this.message = this.message.replace(regexp, String(variables[variable as keyof typeof variables] ?? ''));
    }

    return this.message;
  }

  @timer()
  async parse (attr: { [name: string]: any, sender: CommandOptions['sender'], 'message-type'?: string, forceWithoutAt?: boolean } = { sender: getBotSender() }) {
    this.message = await this.message; // if is promise

    await this.global({ sender: attr.sender });

    await this.parseMessageEach(price, attr);
    await this.parseMessageEach(info, attr);
    await this.parseMessageEach(youtube, attr);
    await this.parseMessageEach(random, attr);
    await this.parseMessageEach(ifp, attr, false);
    if (attr.replaceCustomVariables || typeof attr.replaceCustomVariables === 'undefined') {
      await this.parseMessageVariables(custom, attr);
    }
    await this.parseMessageEach(param, attr, true);
    // local replaces
    if (!_.isNil(attr)) {
      for (let [key, value] of Object.entries(attr)) {
        if (key === 'sender') {
          if (typeof value.username !== 'undefined') {
            value = tmi.showWithAt && attr.forceWithoutAt !== true ? `@${value.username}` : value.username;
          } else {
            value = tmi.showWithAt && attr.forceWithoutAt !== true ? `@${value}` : value;
          }
        }
        this.message = this.message.replace(new RegExp('[$]' + key, 'g'), value);
      }
    }
    await this.parseMessageEach(math, attr);
    await this.parseMessageOnline(online, attr);
    await this.parseMessageCommand(command, attr);
    await this.parseMessageEach(qs, attr, false);
    await this.parseMessageEach(list, attr);
    await this.parseMessageEach(stream, attr);
    await this.parseMessageEach(count, attr);
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
          this.message = this.message.replace(rMessage[bkey], await fnc(rMessage[bkey], _.cloneDeep(attr))).trim();
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
          if (!(await fnc(rMessage[bkey], _.cloneDeep(attr)))) {
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
          const newString = await fnc(rMessage[bkey], _.cloneDeep(attr));
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
          const newString = await fnc(rMessage[bkey], _.cloneDeep(attr));
          if ((_.isNil(newString) || newString.length === 0) && removeWhenEmpty) {
            this.message = '';
          }
          this.message = this.message.replace(rMessage[bkey], newString).trim();
        }
      }
    }
  }

  @timer()
  async parseMessageEach (filters: ResponseFilter, attr: Parameters<ResponseFilter[string]>[1], removeWhenEmpty = true) {
    if (this.message.trim().length === 0) {
      return;
    }
    for (const key in filters) {
      const fnc = filters[key];
      let regexp = _.escapeRegExp(key);

      if (key.startsWith('$')) {
        regexp = regexp.replace(/#/g, '(\\b.+?\\b)');
      } else {
        regexp = regexp.replace(/#/g, '([\\S ]+?)'); // default behavior for if
      }
      const rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')));
      if (rMessage !== null) {
        for (const bkey in rMessage) {
          const newString = await fnc(rMessage[bkey], _.cloneDeep(attr));
          if ((_.isNil(newString) || newString.length === 0) && removeWhenEmpty) {
            this.message = '';
          }
          this.message = this.message.replace(rMessage[bkey], newString).trim();
        }
      }
    }
  }
}

export { Message };
export default Message;
