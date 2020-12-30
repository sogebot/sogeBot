import { shuffle } from './shuffle';

function sample<T> (array: T[]) {
  if (array.length === 0) {
    throw new Error('Array cannot be empty to get sample');
  }
  return shuffle(array)[0];
}

export { sample };