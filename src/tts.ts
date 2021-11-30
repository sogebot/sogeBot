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

enum services {
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
            this.googleVoices = list.data.voices?.map(o => String(o.name)) ?? [];
            info(`TTS: Cached ${this.googleVoices.length} Google Service voices.`);
            //const list = await texttospeech.voices.list()
            // console.log({ list })
            /*const synthesize = await texttospeech.text.synthesize({
              requestBody: {
                'audioConfig': {
                  'audioEncoding': 'MP3',
                  'pitch':         0,
                  'speakingRate':  1.00,
                },
                'input': {
                  'text': 'Some text input here',
                },
                'voice': {
                  'languageCode': 'en-US',
                  'name':         'en-US-Wavenet-F',
                },
              },
            });

            if (synthesize.data.audioContent) {
              // Write the binary audio content to a local file
              writeFile('output_b64.mp3', synthesize.data.audioContent, 'binary', () => {
                console.log('Content written');
              });
            }*/
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
}

export default new TTS();
