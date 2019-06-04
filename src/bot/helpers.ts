import _ from 'lodash';

export function flattenKeys(obj, path: string[] = []) {
  return !_.isObject(obj)
    ? { [path.join('.')]: obj }
    : _.reduce(obj, (cum, next, key) => _.merge(cum, flattenKeys(next, [...path, key])), {});
}
