export let mainLoaded = false;

export const isAvailableVariable = async function(variable: string) {
  return new Promise((resolve, reject) => {
    const check = async (retry = 0) => {
      if (typeof (global as any)[variable] === 'undefined' || Object.keys((global as any)[variable]).length === 0) {
        if (retry > 500) {
          reject(variable + ' variable was not loaded');
        } else {
          setTimeout(() => {
            check(++retry);
          }, 10);
        }
      } else {
        resolve();
      }
    };
    check();
  });
};

export const setMainLoaded = async function () {
  mainLoaded = true;
};

export const isMainLoaded = async function() {
  return new Promise((resolve, reject) => {
    const check = async (retry = 0) => {
      if (!mainLoaded) {
        if (retry > 500) {
          reject('Main App was not loaded');
        } else {
          setTimeout(() => {
            check(++retry);
          }, 10);
        }
      } else {
        resolve();
      }
    };
    check();
  });
};


