import assert from 'assert';
const until = require('test-until');
const _ = require('lodash');
const util = require('util');

module.exports = {
  isEqual: async function (variablePath, expected) {
    let isOk = false;
    await until(setError => {
      if (isOk) {
        return true;
      }

      const current = _.get(global, variablePath.replace('global.', ''));
      try {
        assert(_.isEqual(current, expected));
        isOk = true;
      } catch (err) {
        return setError(
          '\nExpected value: "' + util.inspect(expected) + '"\nActual value: "' + util.inspect(current) + '"'
          + '\n\nVariable: "global.' + variablePath);
      }
    }, 1000);
  },
};
