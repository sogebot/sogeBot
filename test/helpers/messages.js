const assert = require('assert');
const until = require('test-until');
const chalk = require('chalk');
const sinon = require('sinon');
const _ = require('lodash');
const { prepare } = require('../../dest/commons');

let eventSpy;

const log = require('../../dest/helpers/log');
const events = (require('../../dest/events')).default
const tmi = (require('../../dest/tmi')).default


module.exports = {
  prepare: function () {
    log.debug('test', chalk.bgRed('*** Restoring all spies ***'));

    if (eventSpy) {
      eventSpy.restore();
    }
    eventSpy = sinon.spy(events, 'fire');

    tmi.client = {
      bot: {
        chat: {
          say: function () { },
          color: function () {},
          timeout: function () {},
          on: function () {},
          connect: function () {},
          join: function () {},
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
        },
      },
    };

    try {
      sinon.stub(log, 'chatOut');
      sinon.stub(log, 'warning');
      sinon.spy(log, 'debug'); // spy because we want to have debug messages printed
    } catch (e) {
      log.chatOut.reset();
      log.warning.reset();
      log.debug.resetHistory();
    }
  },
  debug: async function (category, expected) {
    await until(setError => {
      const args = log.debug.lastCall.args;
      if (log.debug.calledWith(category, expected)) {
        return true;
      }
      return setError(`\nExpected args: '${category}', '${expected}'\nActual args:   ${args}`);
    }, 5000);
  },
  isWarned: async function (entry, user, opts) {
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
  isSent: async function (entry, user, opts, wait) {
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
