/* eslint-disable @typescript-eslint/no-empty-function */
import assert from 'assert';
import util from 'util';

import chalk from 'chalk';
import _ from 'lodash';
import sinon from 'sinon';
import until from 'test-until';

let eventSpy;

import * as log from '../../dest/helpers/log.js';

export const prepare = () => {
  Promise.all([
    import('../../dest/helpers/events/emitter.js'),
    import('../../dest/services/twitch/chat.js'),
  ]).then((imports) => {
    const eventEmitter = imports[0].eventEmitter;
    const tmi = imports[1].default;

    log.debug('test', chalk.bgRed('*** Restoring all spies ***'));

    if (eventSpy) {
      eventSpy.restore();
    }
    eventSpy = sinon.spy(eventEmitter, 'emit');

    tmi.client = {
      bot: {
        say:           function () {},
        deleteMessage: function() {},
        color:         function () {},
        timeout:       function () {},
        on:            function () {},
        connect:       function () {},
        join:          function () {},
        part:          function () {},
      },
      broadcaster: {
        say:           function () {},
        deleteMessage: function() {},
        color:         function () {},
        timeout:       function () {},
        on:            function () {},
        connect:       function () {},
        join:          function () {},
        part:          function () {},
      },
    };

    log.chatOut.reset();
    log.warning.reset();
    log.debug.reset();
  })
}
  export const debug = async (category, expected, waitMs = 5000) => {
    await until(setError => {
      if (Array.isArray(expected)) {
        for (const ex of expected) {
          if (log.debug.calledWith(category, ex)) {
            return true;
          }
        }
      } else {
        if (log.debug.calledWith(category, expected)) {
          return true;
        }
      }
      return setError(
        '\n+\t' + expected
        + log.debug.args.filter(o => o.includes(category)).join('\n-\t'),
      );
    }, waitMs);
  }
  export const isWarnedRaw = async (entry, user, opts) => {
    opts = opts || {};
    await until(async setError => {
      let expected = [];
      if (_.isArray(opts)) {
        for (let i = 0; i < opts.length; i++) {
          expected.push(entry);
        }
      } else {
        expected = [entry];
      }
      try {
        let isCorrectlyCalled = false;
        for (const e of expected) {
          if (log.warning.calledWith(e)) {
            isCorrectlyCalled = true;
            break;
          }
        }
        assert(isCorrectlyCalled);
        log.warning.reset();
        return true;
      } catch (err) {
        return setError(
          '\nExpected message:\t"' + JSON.stringify(expected) + '"\nActual message:\t"' + (!_.isNil(log.warning.lastCall) ? log.warning.lastCall.args[0] : '') + '"');
      }
    }, 5000);
  }
  export const isWarned = async (entry, user, opts) => {
    const { prepare } = await import('../../dest/helpers/commons/prepare.js');
    user = _.cloneDeep(user);
    opts = opts || {};
    await until(async setError => {
      let expected = [];
      if (_.isArray(opts)) {
        for (const o of opts) {
          o.sender = _.isNil(user.userName) ? '' : user.userName;
          expected.push(prepare(entry, o));
        }
      } else {
        opts.sender = _.isNil(user.userName) ? '' : user.userName;
        expected = [prepare(entry, opts)];
      }
      try {
        let isCorrectlyCalled = false;
        for (const e of expected) {
          if (log.warning.calledWith(e)) {
            isCorrectlyCalled = true;
            break;
          }
        }
        assert(isCorrectlyCalled);
        log.warning.reset();
        return true;
      } catch (err) {
        return setError(
          '\nExpected message:\t"' + JSON.stringify(expected) + '"\nActual message:\t"' + (!_.isNil(log.warning.lastCall) ? log.warning.lastCall.args[0] : '') + '"');
      }
    }, 5000);
  }
  export const isSent = util.deprecate(async function (entry, user, opts, wait) {
    const { prepare } = await import('../../dest/helpers/commons/prepare.js');
    if (typeof user === 'string') {
      user = {
        userName: user,
      };
    }
    user = _.cloneDeep(user);
    opts = opts || {};
    return until(async setError => {
      const expected = [];
      if (_.isArray(opts)) {
        for (const o of opts) {
          o.sender = _.isNil(user.userName) ? '' : user.userName;
          if (_.isArray(entry)) {
            for (const e of entry) {
              expected.push(prepare(e, o));
            }
          } else {
            expected.push(prepare(entry, o));
          }
        }
      } else {
        opts.sender = _.isNil(user.userName) ? '' : user.userName;
        if (_.isArray(entry)) {
          for (const e of entry) {
            expected.push(prepare(e, opts));
          }
        } else {
          expected.push(prepare(entry, opts));
        }
      }
      try {
        let isCorrectlyCalled = false;
        for (let e of expected) {
          if (e.includes('missing_translation')) {
            setError('Missing translations! ' + e);
            return false;
          }
          if (user.userName) {
            e += ` [${user.userName}]`;
          }
          /*
          console.dir(log.chatOut.args, { depth: null })
          console.log({ expected: e, user })
          */
          if (log.chatOut.calledWith(e)) {
            isCorrectlyCalled = true;
            break;
          }
        }
        assert(isCorrectlyCalled);
        return true;
      } catch (err) {
        return setError(
          '\nExpected message:\t"' + expected + '"'
          + '\nActual message:\t\t"' + log.chatOut.args.join('\n\t\t\t') + '"',
        );
      }
    }, wait || 5000);
  }, 'We should not use isSent as it may cause false positive tests')
  export const sentMessageContain = async (expected, wait) => {
    if (!Array.isArray(expected)) {
      expected = [expected];
    }
    return until(setError => {
      try {
        let isOK = false;
        for (const e of expected) {
          if (isOK) {
            break;
          }
          for (const args of log.chatOut.args) {
            if (args[0].includes(e)) {
              isOK = true;
              break;
            }
          }
        }
        assert(isOK);
        return true;
      } catch (err) {
        return setError(
          '\nExpected message to contain:\t' + expected
          + '\nActual message:\t\t' + log.chatOut.args.join('\n\t\t\t'),
        );
      }
    }, wait || 5000);
  }
  export const isSentRaw = async (expected, user, wait) => {
    if (!Array.isArray(expected)) {
      expected = [expected];
    }
    if (typeof user === 'string') {
      user = {
        userName: user,
      };
    }
    if (!user) {
      user = { userName: '__bot__' };
    }
    user = _.cloneDeep(user);
    return until(setError => {
      try {
        let isOK = false;
        for (let e of expected) {
          if (user.userName) {
            e += ` [${user.userName}]`;
          }
          if (log.chatOut.calledWith(e)) {
            isOK = true;
            break;
          }
        }
        assert(isOK);
        return true;
      } catch (err) {
        return setError(
          '\nExpected message:\t' + expected + ` [${user.userName}]`
          + '\nActual message:\t\t' + log.chatOut.args.join('\n\t\t\t'),
        );
      }
    }, wait || 5000);
  }
  export const isNotSent = async (expected, user, wait) => {
    if (typeof user === 'string') {
      user = {
        userName: user,
      };
    }
    user = _.cloneDeep(user);
    const race = await Promise.race([
      isSent(expected, user, wait * 2),
      new Promise((resolve) => {
        setTimeout(() => resolve(false), wait);
      }),
    ]);
    assert(!race, 'Message was unexpectedly sent ' + expected);
  }
  export const isNotSentRaw = async (expected, user, wait) => {
    if (typeof user === 'string') {
      user = {
        userName: user,
      };
    }
    user = _.cloneDeep(user);
    const race = await Promise.race([
      isSentRaw(expected, user, wait * 2),
      new Promise((resolve) => {
        setTimeout(() => resolve(false), wait);
      }),
    ]);
    assert(!race, 'Message was unexpectedly sent ' + expected);
  }