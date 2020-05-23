import glob from 'glob';

import Widget from './_interface';
import { adminEndpoint } from '../helpers/socket';

class SoundBoard extends Widget {
  constructor() {
    super();
    this.addWidget('soundboard', 'widget-title-soundboard', 'fas fa-music');
  }

  public sockets() {
    adminEndpoint(this.nsp, 'getSoundBoardSounds', (cb) => {
      try {
        glob('public/dist/soundboard/*.mp3', (err, files) => {
          if (err) {
            return cb(err.message, []);
          }

          const sounds: string[] = [];
          for (const file of files) {
            const filename = file.split('/').pop();
            if (filename) {
              sounds.push(filename.replace('.mp3', ''));
            }
          }
          cb(null, sounds);
        });
      } catch (e) {
        cb(e.stack, []);
      }
    });
  }
}

export default new SoundBoard();
