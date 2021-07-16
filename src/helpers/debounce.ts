const debouncing: { [func: string]: number } = {};

export const debounce = async (identification: string, ms = 500): Promise<boolean> => {
  if (debouncing[identification]) {
    const shouldBeDeleted = Date.now() - debouncing[identification] > ms + 50;
    if (shouldBeDeleted) {
      delete debouncing[identification];
    }
  }

  const isAlreadyWaiting = typeof debouncing[identification] !== 'undefined';
  debouncing[identification] = Date.now();
  if (isAlreadyWaiting) {
    return false; // do nothing after this (we have first waiting function)
  } else {
    // initial function - waiting for expected ms
    return new Promise((resolve) => {
      const check = () => {
        const shouldBeRun = Date.now() - debouncing[identification] > ms;
        if (shouldBeRun) {
          resolve(true);
        } else {
          setTimeout(() => check(), 10);
        }
      };
      check();
    });
  }
};