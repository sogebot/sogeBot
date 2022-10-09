/* eslint-disable @typescript-eslint/no-empty-function */
const assert = require('assert');
const util = require('util');

const chalk = require('chalk');
const _ = require('lodash');
const sinon = require('sinon');
const until = require('test-until');

let eventSpy;

const log = require('../../dest/helpers/log');

module.exports = {
  prepare: function () {
    const eventEmitter = (require('../../dest/helpers/events/emitter')).eventEmitter;
    const tmi = (require('../../dest/services/twitch/chat')).default;

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

    try {
      sinon.stub(log, 'chatOut');
    } catch (e) {
      log.chatOut.reset();
    }

    try {
      sinon.stub(log, 'warning');
    } catch (e) {
      log.warning.reset();
    }

    try {
      sinon.stub(log, 'debug');
    } catch (e) {
      log.debug.reset();
    }
  },
  debug: async function (category, expected, waitMs = 5000) {
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
  },
  isWarnedRaw: async function (entry, user, opts) {
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
  },
  isWarned: async function (entry, user, opts) {
    const { prepare } = require('../../dest/helpers/commons/prepare');
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
  },
  isSent: util.deprecate(async function (entry, user, opts, wait) {
    const { prepare } = require('../../dest/helpers/commons/prepare');
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
  }, 'We should not use isSent as it may cause false positive tests'),
  sentMessageContain: async function (expected, wait) {
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
  },
  isSentRaw: async function (expected, user, wait) {
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
  },
  isNotSent: async function (expected, user, wait) {
    if (typeof user === 'string') {
      user = {
        userName: user,
      };
    }
    user = _.cloneDeep(user);
    const race = await Promise.race([
      this.isSent(expected, user, wait * 2),
      new Promise((resolve) => {
        setTimeout(() => resolve(false), wait);
      }),
    ]);
    assert(!race, 'Message was unexpectedly sent ' + expected);
  },
  isNotSentRaw: async function (expected, user, wait) {
    if (typeof user === 'string') {
      user = {
        userName: user,
      };
    }
    user = _.cloneDeep(user);
    const race = await Promise.race([
      this.isSentRaw(expected, user, wait * 2),
      new Promise((resolve) => {
        setTimeout(() => resolve(false), wait);
      }),
    ]);
    assert(!race, 'Message was unexpectedly sent ' + expected);
  },
};
