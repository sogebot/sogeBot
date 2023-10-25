import { v4 } from 'uuid';

import Overlay from './_interface.js';
import {
  command, default_permission,
} from '../decorators.js';
import { warning } from '../helpers/log.js';

import { onStartup } from '~/decorators/on.js';
import { eventEmitter } from '~/helpers/events/index.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions.js';

class TextToSpeech extends Overlay {
  @onStartup()
  onStartup() {
    eventEmitter.on('highlight', (opts) => {
      this.textToSpeech({
        parameters:  opts.message,
        isHighlight: true,
      } as any);
    });
  }

  @command('!tts')
  @default_permission(defaultPermissions.CASTERS)
  async textToSpeech(opts: CommandOptions): Promise<CommandResponse[]> {
    const { default: tts, services } = await import ('../tts.js');
    if (tts.ready) {
      let key = v4();
      if (tts.service === services.RESPONSIVEVOICE) {
        key = tts.responsiveVoiceKey;
      }
      if (tts.service === services.GOOGLE) {
        tts.addSecureKey(key);
      }

      this.emit('speak', {
        text:      opts.parameters,
        highlight: opts.isHighlight,
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
