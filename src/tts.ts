'use strict';

import { JWT } from 'google-auth-library';
import { google } from 'googleapis';
import _ from 'lodash';

import Core from '~/_interface';
import { settings } from '~/decorators';
import {
  onStartup,
} from '~/decorators/on';
import { error, info, warning } from '~/helpers/log';
import { adminEndpoint } from '~/helpers/socket';

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
    googleClientEmail = '';
  @settings()
    googleVoices: string[] = [];

  sockets() {
    adminEndpoint(this.nsp, 'settings.refresh', async () => {
      this.onStartup(); // reset settings
    });

    adminEndpoint(this.nsp, 'google::speak', async (opts, cb) => {
      const audioContent = await this.googleSpeak(opts as any);
      if (cb) {
        cb(null, audioContent);
      }
    });
  }

  @onStartup()
  onStartup() {
    switch(this.service) {
      case services.NONE:
        warning('TTS: no selected service has been configured.');
        break;
      case services.GOOGLE:
        try {
          if (this.googleClientEmail.length === 0) {
            throw new Error('Missing client email');
          }
          if (this.googlePrivateKey.length === 0) {
            throw new Error('Missing private key');
          }
          // configure a JWT auth client
          jwtClient = new google.auth.JWT(
            this.googleClientEmail,
            undefined,
            this.googlePrivateKey,
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
            this.googleVoices = list.data.voices?.map(o => String(o.name)).sort() ?? [];
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
      return this.googleClientEmail.length > 0 && this.googlePrivateKey.length > 0;
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
