import assert from 'assert';
import until from 'test-until';
import _ from 'lodash';
import util from 'util';

export const isEqual = async (variablePath, expected) => {
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
}
