export const setImmediateAwait = () => {
  return new Promise(resolve => {
    setImmediate(() => resolve(true));
  });
};