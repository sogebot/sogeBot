import _ from 'lodash';

export let mainLoaded = false;

export const isAvailableVariable = async function(variable) {
  return new Promise((resolve, reject) => {
    const check = async (r, retry) => {
      if (typeof global[variable] === 'undefined' || _.size(global[variable]) === 0) {
        if (retry > 500) {
          reject(variable + ' variable was not loaded');
        } else {
          setTimeout(() => {
            check(r, ++retry);
          }, 10);
        }
      } else {
        r();
      }
    };
    check(resolve, 0);
  });
};

export const setMainLoaded = async function () {
  mainLoaded = true;
};

export const isMainLoaded = async function() {
  return new Promise((resolve, reject) => {
    const check = async (r, retry) => {
      if (!mainLoaded) {
        if (retry > 500) {
          reject('Main App was not loaded');
        } else {
          setTimeout(() => {
            check(r, ++retry);
          }, 10);
        }
      } else {
        r();
      }
    };
    check(resolve, 0);
  });
};


