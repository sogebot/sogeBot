import type { UIError } from '~/../d.ts/src/helpers/panel/alerts.js';

const warns: UIError[] = [];
const errors: UIError[] = [];

function addUIWarn (warn: UIError) {
  warns.push(warn);
}

function addUIError (error: UIError) {
  errors.push(error);
}

export {
  warns, addUIWarn, errors, addUIError,
};