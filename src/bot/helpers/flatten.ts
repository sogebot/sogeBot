/*
 * Flatten object keys
 * { a: { b: 'c' }} => { 'a.b': 'c' }
 */
export function flatten(data): { [x: string]: any } {
  const result = {};
  function recurse(cur, prop): void {
    if (Object(cur) !== cur || Array.isArray(cur)) {
      result[prop] = cur;
    } else {
      let isEmpty = true;
      for (const p of Object.keys(cur)) {
        isEmpty = false;
        recurse(cur[p], prop ? prop + '.' + p : p);
      }
      if (isEmpty && prop) {
        result[prop] = {};
      }
    }
  }
  recurse(data, '');
  return result;
}

/*
 * Unflatten object keys
 * { 'a.b': 'c' } => { a: { b: 'c' }}
 */
export function unflatten(data) {
  let result;
  if (Array.isArray(data)) {
    result = [];
    // create unflatten each item
    for (const o of data) {
      result.push(unflatten(o));
    }
  } else {
    result = {};
    for (const i of Object.keys(data)) {
      const keys = i.split('.');
      keys.reduce((r, e, j)  => {
        return r[e] || (r[e] = isNaN(Number(keys[j + 1])) ? (keys.length - 1 === j ? data[i] : {}) : []);
      }, result);
    }
  }
  return result;
}