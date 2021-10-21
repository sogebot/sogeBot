const assert = require('assert');
const until = require('test-until');
const chalk = require('chalk');
const util = require('util');
const sinon = require('sinon');
const _ = require('lodash');

let eventSpy;

const log = require('../../dest/helpers/log');

module.exports = {
  prepare: function () {
    const eventEmitter = (require('../../dest/helpers/events/emitter')).eventEmitter;
    const tmi = (require('../../dest/chat')).default;

    log.debug('test', chalk.bgRed('*** Restoring all spies ***'));

    if (eventSpy) {
      eventSpy.restore();
    }
    eventSpy = sinon.spy(eventEmitter, 'emit');

    tmi.client = {
      bot: {
        chat: {
          say: function () { },
          color: function () {},
          timeout: function () {},
          on: function () {},
          connect: function () {},
          join: function () {},
          part: function () {},
        },
      },
      broadcaster: {
        chat: {
          say: function () { },
          color: function () {},
          timeout: function () {},
          on: function () {},
          connect: function () {},
          join: function () {},
          part: function () {},
        },
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
      sinon.spy(log, 'debug'); // spy because we want to have debug messages printed
    } catch (e) {
      log.chatOut.reset();
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
        '\n+\t"' + expected + '"'
        + '\n-\t\t"' + log.debug.args.join('\n\t\t\t') + '"'
      );
    }, waitMs);
  },
  isWarned: async function (entry, user, opts) {
    const { prepare } = require('../../dest/helpers/commons/prepare');
    user = _.cloneDeep(user);
    opts = opts || {};
    await until(async setError => {
      let expected = [];
      if (_.isArray(opts)) {
        for (const o of opts) {
          o.sender = _.isNil(user.username) ? '' : user.username;
          expected.push(prepare(entry, o));
        }
      } else {
        opts.sender = _.isNil(user.username) ? '' : user.username;
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
        username: user,
      };
    }
    user = _.cloneDeep(user);
    opts = opts || {};
    return until(async setError => {
      const expected = [];
      if (_.isArray(opts)) {
        for (const o of opts) {
          o.sender = _.isNil(user.username) ? '' : user.username;
          if (_.isArray(entry)) {
            for (const e of entry) {
              expected.push(prepare(e, o));
            }
          } else {
            expected.push(prepare(entry, o));
          }
        }
      } else {
        opts.sender = _.isNil(user.username) ? '' : user.username;
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
          if (user.username) {
            e += ` [${user.username}]`;
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
          + '\nActual message:\t\t"' + log.chatOut.args.join('\n\t\t\t') + '"'
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
          + '\nActual message:\t\t' + log.chatOut.args.join('\n\t\t\t')
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
        username: user,
      };
    }
    if (!user) {
      user = { username: 'bot' };
    }
    user = _.cloneDeep(user);
    return until(setError => {
      try {
        let isOK = false;
        for (let e of expected) {
          if (user.username) {
            e += ` [${user.username}]`;
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
          '\nExpected message:\t' + expected + ` [${user.username}]`
          + '\nActual message:\t\t' + log.chatOut.args.join('\n\t\t\t')
        );
      }
    }, wait || 5000);
  },
  isNotSent: async function (expected, user, wait) {
    if (typeof user === 'string') {
      user = {
        username: user,
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
        username: user,
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
