import Overlay from './_interface';

import { command, default_permission, parser, settings, ui } from '../decorators';

import { default as ResponsiveVoice } from '../integrations/responsivevoice';
import { permission } from '../helpers/permissions';

class TextToSpeech extends Overlay {
  @ui({
    if: () => ResponsiveVoice.key.trim().length === 0,
    type: 'helpbox',
    variant: 'danger',
  }, 'settings')
  responsiveVoiceKeyNotSet = null;

  @ui({
    type: 'voice',
    if: () => ResponsiveVoice.key.trim().length > 0,
  })
  @settings('settings')
  voice = 'UK English Female';
  @ui({
    type: 'number-input',
    max: 100,
    min: 0,
    step: 1,
    if: () => ResponsiveVoice.key.trim().length > 0,
  })
  @settings('settings')
  volume = 50;
  @ui({
    type: 'number-input',
    max: 1.5,
    min: 0.1,
    step: 0.1,
    if: () => ResponsiveVoice.key.trim().length > 0,
  })
  @settings('settings')
  rate = 1.0;
  @ui({
    type: 'number-input',
    max: 2,
    min: 0.1,
    step: 0.1,
    if: () => ResponsiveVoice.key.trim().length > 0,
  })
  @settings('settings')
  pitch = 1.0;
  @ui({
    type: 'toggle-enable',
    if: () => ResponsiveVoice.key.trim().length > 0,
  })
  @settings('settings')
  triggerTTSByHighlightedMessage = false;

  @ui({
    type: 'link',
    href: '/overlays/tts',
    class: 'btn btn-primary btn-block',
    rawText: '/overlays/tts',
    target: '_blank',
  }, 'links')
  linkBtn = null;

  @command('!tts')
  @default_permission(permission.CASTERS)
  textToSpeech(opts: CommandOptions): CommandResponse[] {
    this.emit('speak', {
      text: opts.parameters,
      rate: this.rate,
      volume: this.volume,
      pitch: this.pitch,
      voice: this.voice,
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
    if (opts.sender.msgId && opts.sender.msgId === 'highlighted-message' && this.triggerTTSByHighlightedMessage) {
      this.textToSpeech({ parameters: opts.message, command: '!tts', createdAt: Date.now(), sender: opts.sender, attr: {} });
    }
  }
}

export default new TextToSpeech();
