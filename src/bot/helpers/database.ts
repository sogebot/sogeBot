import { getManager } from 'typeorm';

export let isDbConnected = false;

async function setIsDbConnected () {
  try {
    isDbConnected = (await getManager()).connection.isConnected;
  } catch (e) {}
  if (!isDbConnected) {
    setTimeout(() => setIsDbConnected(), 1000);
  }
}
setTimeout(() => {
  setIsDbConnected();
}, 5000);