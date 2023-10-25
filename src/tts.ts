import { MINUTE } from '@sogebot/ui-helpers/constants.js';
import { JWT } from 'google-auth-library';
import { google } from 'googleapis';

import Core from '~/_interface.js';
import { GooglePrivateKeys } from '~/database/entity/google.js';
import { AppDataSource } from '~/database.js';
import {
  onStartup,
} from '~/decorators/on.js';
import { settings } from '~/decorators.js';
import { error, info, warning } from '~/helpers/log.js';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket.js';

/* secureKeys are used to authenticate use of public overlay endpoint */
const secureKeys = new Set<string>();

export enum services {
  'NONE' = -1,
  'RESPONSIVEVOICE',
  'GOOGLE'
}

let jwtClient: null | JWT = null;

class TTS extends Core {
  @settings()
    service: services = services.NONE;

  @settings()
    responsiveVoiceKey = '';

  @settings()
    googlePrivateKey = '';
  @settings()
    googleVoices: string[] = [];

  addSecureKey(key: string) {
    secureKeys.add(key);
    setTimeout(() => {
      secureKeys.delete(key);
    }, 10 * MINUTE);
  }

  sockets() {
    adminEndpoint('/core/tts', 'settings.refresh', async () => {
      this.onStartup(); // reset settings
    });

    adminEndpoint('/core/tts', 'google::speak', async (opts, cb) => {
      const audioContent = await this.googleSpeak(opts);
      if (cb) {
        cb(null, audioContent);
      }
    });

    publicEndpoint('/core/tts', 'speak', async (opts, cb) => {
      if (secureKeys.has(opts.key)) {
        secureKeys.delete(opts.key);

        if (!this.ready) {
          cb(new Error('TTS is not properly set and ready.'));
          return;
        }

        if (this.service === services.GOOGLE) {
          try {
            const audioContent = await this.googleSpeak(opts);
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

  @onStartup()
  async onStartup() {
    switch(this.service) {
      case services.NONE:
        warning('TTS: no selected service has been configured.');
        break;
      case services.GOOGLE:
        try {
          if (this.googlePrivateKey.length === 0) {
            throw new Error('Missing private key');
          }

          // get private key
          const privateKey = await AppDataSource.getRepository(GooglePrivateKeys).findOneByOrFail({ id: this.googlePrivateKey });

          // configure a JWT auth client
          jwtClient = new google.auth.JWT(
            privateKey.clientEmail,
            undefined,
            privateKey.privateKey,
            ['https://www.googleapis.com/auth/cloud-platform']);
        } catch (err) {
          error('TTS: Something went wrong with authentication to Google Service.');
          error(err);
          jwtClient = null;
        }

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
        break;
      case services.RESPONSIVEVOICE:
        if (this.responsiveVoiceKey.length > 0) {
          info('TTS: ResponsiveVoice ready.');
        } else {
          warning('TTS: ResponsiveVoice ApiKey is not properly set.');
        }
        break;
    }
  }

  get ready() {
    if (this.service === services.NONE) {
      return false;
    }

    if (this.service === services.RESPONSIVEVOICE) {
      return this.responsiveVoiceKey.length > 0;
    }

    if (this.service === services.GOOGLE) {
      return this.googlePrivateKey.length > 0;
    }
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

    const volumeGainDb = -6 + (12 * opts.volume);
    const synthesize = await texttospeech.text.synthesize({
      requestBody: {
        audioConfig: {
          audioEncoding: 'MP3',
          pitch:         opts.pitch,
          speakingRate:  opts.rate,
          volumeGainDb:  volumeGainDb,
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
