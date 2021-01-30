import {
  command, default_permission, parser,
} from '../decorators';
import { defaultPermissions } from '../helpers/permissions/';
import Overlay from './_interface';

class TextToSpeech extends Overlay {
  @command('!tts')
  @default_permission(defaultPermissions.CASTERS)
  textToSpeech(opts: CommandOptions): CommandResponse[] {
    this.emit('speak', {
      text:      opts.parameters,
      highlight: opts.attr.highlight,
    });
    return [];
  }

  /**
   * Parsers text to speech
   * Inspired by: https://discordapp.com/channels/317348946144002050/317349069024395264/707237020342419507
   * @param opts
   */
  @parser({ fireAndForget: true })
  async checkTriggerTTSByHighlightedMessage(opts: ParserOptions) {
    if (opts.sender.msgId && opts.sender.msgId === 'highlighted-message') {
      this.textToSpeech({
        parameters: opts.message, command: '!tts', createdAt: Date.now(), sender: opts.sender, attr: { highlight: true },
      });
    }
  }
}

export default new TextToSpeech();
