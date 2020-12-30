/*
  https://stackoverflow.com/a/12646864
  Durstenfeld shuffle
*/

function shuffle<T>(array: T[]) {
  const newArray = [ ...array ];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export { shuffle };