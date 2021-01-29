export type UIError = { name: string; message: string };

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