import { MINUTE } from '@sogebot/ui-helpers/constants';
import { v4 } from 'uuid';

import {
  command, default_permission,
} from '../decorators';
import { warning } from '../helpers/log';
import Overlay from './_interface';

import { defaultPermissions } from '~/helpers/permissions/index';
import { publicEndpoint } from '~/helpers/socket';

/* secureKeys are used to authenticate use of public overlay endpoint */
const secureKeys = new Set<string>();

class TextToSpeech extends Overlay {
  sockets() {
    publicEndpoint(this.nsp, 'speak', async (opts, cb) => {
      if (secureKeys.has(opts.key)) {
        secureKeys.delete(opts.key);

        const { default: tts, services } = await import ('../tts');
        if (!tts.ready) {
          cb(new Error('TTS is not properly set and ready.'));
          return;
        }

        if (tts.service === services.GOOGLE) {
          try {
            const audioContent = await tts.googleSpeak(opts);
            cb(null, audioContent);
          } catch (e) {
            cb(e);
          }
        }
      } else {
        cb(new Error('Invalid auth.'));
      }
    });
  }

  @command('!tts')
  @default_permission(defaultPermissions.CASTERS)
  async textToSpeech(opts: CommandOptions): Promise<CommandResponse[]> {
    const { default: tts, services } = await import ('../tts');
    if (tts.ready) {
      let key = v4();
      if (tts.service === services.RESPONSIVEVOICE) {
        key = tts.responsiveVoiceKey;
      }
      if (tts.service === services.GOOGLE) {
        // add secureKey
        secureKeys.add(key);
        setTimeout(() => {
          secureKeys.delete(key);
        }, 10 * MINUTE);
      }

      this.emit('speak', {
        text:      opts.parameters,
        highlight: opts.attr.highlight,
        service:   tts.service,
        key,
      });
    } else {
      warning('!tts command cannot be executed. TTS is not properly set in a bot.');
    }
    return [];
  }
}

export default new TextToSpeech();
