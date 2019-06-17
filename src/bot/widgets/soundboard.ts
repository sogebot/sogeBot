import glob from 'glob';

import Widget from './_interface';

class SoundBoard extends Widget {
  constructor() {
    super();
    this.addWidget('soundboard', 'widget-title-soundboard', 'fas fa-music');
  }

  public sockets() {
    if (this.socket === null) {
      return setTimeout(() => this.sockets(), 100);
    }
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

export default SoundBoard;
export { SoundBoard };
