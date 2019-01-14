import * as _ from 'lodash'

export default async function (variable) {
  return new Promise((resolve, reject) => {
    const check = async (r, retry) => {
      if (typeof global[variable] === 'undefined' || _.size(global[variable]) === 0) {
        if (retry > 100) {
          reject(variable + ' variable was not loaded')
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