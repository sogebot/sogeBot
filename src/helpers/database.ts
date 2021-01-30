import { getManager } from 'typeorm';

export let isDbConnected = false;
export let isBotStarted = false;

async function setIsDbConnected () {
  try {
    isDbConnected = (await getManager()).connection.isConnected;
  } catch (e) {
    require('./log').debug('database', 'Database not yet connected.');
  }
  if (!isDbConnected) {
    setTimeout(() => setIsDbConnected(), 1000);
  }
}

export async function setIsBotStarted () {
  isBotStarted = true;
}
setTimeout(() => {
  setIsDbConnected();
}, 5000);

export function getIsBotStarted () {
  return isBotStarted;
}

export function getIsDbConnected () {
  return isDbConnected;
}