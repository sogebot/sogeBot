export const setImmediateAwait = () => {
  return new Promise(resolve => {
    if (process.env.BUILD === 'web') {
      setTimeout(() => resolve(true), 1);
    } else {
      setImmediate(() => resolve(true));
    }
  });
};