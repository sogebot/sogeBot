function debug(category: string, message: string) {
  const categories = category.split('.');
  if (categories.length > 2) { throw Error('For debug use only <main>.<sub> or *'); }
  if (isEnabled(category)) {
    global.log.debug(`${message}`, { category });
  }
}

function isEnabled(category: string) {
  if (!process.env.DEBUG) { return false; }
  const categories = category.split('.');
  let bEnabled = false;
  bEnabled = process.env.DEBUG.includes(category) || process.env.DEBUG.includes(categories[0] + '.*');
  bEnabled = process.env.DEBUG === '*' || bEnabled;
  return bEnabled;
}

export {debug, isEnabled};
export default debug;
