import * as glob from 'glob';

import Widget from './_interface';

class SoundBoard extends Widget {
  [x: string]: any; // TODO: remove after interface ported to TS

  constructor() {
    super({});
    this.addWidget('soundboard', 'widget-title-soundboard', 'fas fa-music');
  }

  public sockets() {
    this.socket.on('connection', (socket) => {
      socket.on('getSoundBoardSounds', (cb) => {
        glob('public/dist/soundboard/*.mp3', (err, files) => {
          if (err) { return cb([]); }

          const sounds: string[] = [];
          for (const file of files) {
            const filename = file.split('/').pop();
            if (filename) {
              sounds.push(filename.replace('.mp3', ''));
            }
          }
          cb(sounds);
        });
      });
    });
  }
}

module.exports = new SoundBoard();
