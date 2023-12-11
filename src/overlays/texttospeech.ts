import Overlay from './_interface.js';
import {
  command, default_permission,
} from '../decorators.js';

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
    const { generateAndAddSecureKey } = await import ('../tts.js');
    this.emit('speak', {
      text:      opts.parameters,
      highlight: opts.isHighlight,
      key:       generateAndAddSecureKey(),
    });
    return [];
  }
}

export default new TextToSpeech();
