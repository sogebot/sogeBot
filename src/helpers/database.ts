export let isDbConnected = false;
export let isBotStarted = false;

export async function setIsDbConnected () {
  isDbConnected = true;
}

export async function setIsBotStarted () {
  isBotStarted = true;
}

export function getIsBotStarted () {
  return isBotStarted;
}

export function getIsDbConnected () {
  return isDbConnected;
}