import { randomUUID } from 'crypto';

import { MINUTE } from '@sogebot/ui-helpers/constants.js';
import { JWT } from 'google-auth-library';
import { google } from 'googleapis';

import { TTSService } from './database/entity/overlay.js';

import Core from '~/_interface.js';
import { GooglePrivateKeys } from '~/database/entity/google.js';
import { AppDataSource } from '~/database.js';
import {
  onChange,
  onStartup,
} from '~/decorators/on.js';
import { settings } from '~/decorators.js';
import { error, info, warning } from '~/helpers/log.js';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket.js';

/* secureKeys are used to authenticate use of public overlay endpoint */
const secureKeys = new Set<string>();

export const addSecureKey = (key: string) => {
  secureKeys.add(key);
  setTimeout(() => {
    secureKeys.delete(key);
  }, 10 * MINUTE);
};

export const generateAndAddSecureKey = () => {
  const key = randomUUID();
  addSecureKey(key);
  return key;
};

let jwtClient: null | JWT = null;

class TTS extends Core {
  @settings()
    responsiveVoiceKey = '';

  @settings()
    googlePrivateKey = '';
  @settings()
    googleVoices: string[] = [];

  sockets() {
    adminEndpoint('/core/tts', 'settings.refresh', async () => {
      this.initializeTTSServices(); // reset settings
    });

    publicEndpoint('/core/tts', 'speak', async (opts, cb) => {
      if (secureKeys.has(opts.key)) {
        secureKeys.delete(opts.key);

        if (opts.service === TTSService.GOOGLE) {
          const audioContent = await this.googleSpeak(opts);

          if (!audioContent) {
            throw new Error('Something went wrong');
          }
          if (cb) {
            cb(null, audioContent);
          }
        } else {
          throw new Error('Invalid service.');
        }
      } else {
        cb(new Error('Invalid auth.'));
      }
    });

    adminEndpoint('/core/tts', 'speak', async (opts, cb) => {
      try {
        if (opts.service === TTSService.GOOGLE) {
          const audioContent = await this.googleSpeak(opts);

          if (!audioContent) {
            throw new Error('Something went wrong');
          }
          if (cb) {
            cb(null, audioContent);
          }
        } else {
          throw new Error('Invalid service.');
        }
      } catch (e) {
        cb(e);
      }
    });
  }

  initializedGoogleTTSHash: string | null = null;
  async initializeGoogleTTS() {
    if (this.initializedGoogleTTSHash === this.googlePrivateKey && jwtClient) {
      // already initialized
      return;
    }

    if (this.googlePrivateKey.length === 0) {
      warning('TTS: Google Private Key is not properly set.');
      this.initializedGoogleTTSHash = this.googlePrivateKey;
      return;
    }

    try {
    // get private key
      const privateKey = await AppDataSource.getRepository(GooglePrivateKeys).findOneByOrFail({ id: this.googlePrivateKey });

      // configure a JWT auth client
      jwtClient = new google.auth.JWT(
        privateKey.clientEmail,
        undefined,
        privateKey.privateKey,
        ['https://www.googleapis.com/auth/cloud-platform']);

      info('TTS: Authentication to Google Service successful.');

      // authenticate request
      jwtClient?.authorize(async (err) => {
        if (err) {
          error('TTS: Something went wrong with authentication to Google Service.');
          error(err);
          jwtClient = null;
          return;
        } else {
          if (!jwtClient) {
            // this shouldn't occur but make TS happy
            return;
          }

          info('TTS: Authentication to Google Service successful.');
          this.initializedGoogleTTSHash = this.googlePrivateKey;

          const texttospeech = google.texttospeech({
            auth:    jwtClient,
            version: 'v1',
          });

          // get voices list
          const list = await texttospeech.voices.list();
          this.googleVoices = Array.from(new Set(list.data.voices?.map(o => String(o.name)).sort() ?? []));
          info(`TTS: Cached ${this.googleVoices.length} Google Service voices.`);
        }
      });
    } catch (err) {
      error('TTS: Something went wrong with authentication to Google Service.');
      error(err);
      jwtClient = null;
    }
  }

  initializedResponsiveVoiceTTSHash: string | null = null;
  initializeResponsiveVoiceTTS() {
    if (this.initializedResponsiveVoiceTTSHash === this.responsiveVoiceKey) {
      // already initialized
      return;
    }
    if (this.responsiveVoiceKey.length === 0) {
      warning('TTS: ResponsiveVoice ApiKey is not properly set.');
      this.initializedResponsiveVoiceTTSHash = this.responsiveVoiceKey;
      return;
    }
    if (this.responsiveVoiceKey.length > 0) {
      info('TTS: ResponsiveVoice ready.');
      this.initializedResponsiveVoiceTTSHash = this.responsiveVoiceKey;
    } else {
      warning('TTS: ResponsiveVoice ApiKey is not properly set.');
    }
  }

  isReady(service: TTSService) {
    if (service === TTSService.NONE) {
      return false;
    }
    if (service === TTSService.GOOGLE) {
      return this.initializedGoogleTTSHash === this.googlePrivateKey && jwtClient !== null;
    }
    if (service === TTSService.RESPONSIVEVOICE) {
      return this.initializedResponsiveVoiceTTSHash === this.responsiveVoiceKey;
    }
    return false;
  }

  @onStartup()
  @onChange('googlePrivateKey')
  @onChange('responsiveVoiceKey')
  async initializeTTSServices() {
    this.initializeGoogleTTS();
    this.initializeResponsiveVoiceTTS();
  }

  async googleSpeak(opts: {
    volume: number;
    pitch: number;
    rate: number;
    text: string;
    voice: string;
  }) {
    if (!jwtClient) {
      throw new Error('JWT Client is not set');
    }
    const texttospeech = google.texttospeech({
      auth:    jwtClient,
      version: 'v1',
    });

    const synthesize = await texttospeech.text.synthesize({
      requestBody: {
        audioConfig: {
          audioEncoding: 'MP3',
          pitch:         opts.pitch,
          speakingRate:  opts.rate,
          volumeGainDb:  10,
        },
        input: {
          text: opts.text,
        },
        voice: {
          languageCode: `${opts.voice.split('-')[0]}-${opts.voice.split('-')[1]}`,
          name:         opts.voice,
        },
      },
    });
    return synthesize.data.audioContent;
  }
}

export default new TTS();
