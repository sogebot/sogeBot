let waitAfterStart = false;

function isBotStarted() {
  const el = document.getElementById('bot-starting-intro');

  return new Promise(resolve => {
    const check = () => {
      fetch('/health')
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.blob();
        }).then(() => {
          if (el) {
            el.innerHTML = '... registering sockets ...';
          }
          if (!waitAfterStart) {
            console.log('Bot is started, continue');
            resolve(true);
          } else {
            console.log('Bot is started, registering sockets');
            setTimeout(() => {
              console.log('Bot is started, waiting to full bot load');
              if (el) {
                el.innerHTML = '... waiting to full bot load ...';
              }
              setTimeout(() => {
                console.log('Bot is started, continue');
                resolve(true);
              }, 5000);
            }, 5000);
          }
        }).catch(() => {
          if (el) {
            el.style.display = 'block';
            el.innerHTML = '... bot is starting ...';
          }
          console.log('Bot not started yet, waiting');
          waitAfterStart = true;
          setTimeout(() => check(), 5000);
        });
    };
    check();
  });
}

export { isBotStarted };