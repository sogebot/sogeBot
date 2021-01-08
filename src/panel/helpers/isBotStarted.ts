import { getSocket } from './socket';

function isBotStarted() {
  const socket = getSocket('/', true);
  return new Promise(resolve => {
    const check = () => {
      socket.emit('botStatus', (status: boolean) => {
        const el = document.getElementById('bot-starting-intro');
        if (status) {
          console.log('Bot is started, continue');
          resolve(true);
        } else {
          if (el) {
            el.style.display = 'block';
          }
          console.log('Bot not started yet, waiting');
          setTimeout(() => check(), 1000);
        }
      });
    };
    check();
  });
}

export { isBotStarted };