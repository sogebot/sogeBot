import { getRepository } from 'typeorm';
import { GooglePrivateKeys } from '~/database/entity/google';
import { app } from '~/helpers/panel';
import { adminMiddleware } from '~/socket';
import { onStartup } from '~/decorators/on';
import Service from './_interface';

import { google } from 'googleapis';
import { info } from '~/helpers/log';

class Google extends Service {
  clientId = '225380804535-gjd77dplfkbe4d3ct173d8qm0j83f8tr.apps.googleusercontent.com';
  refreshToken = '';

  expiryDate: null | number = null;
  accessToken: null | string = null;

  @onStartup()
  async onStartup() {
    // configure a JWT auth client
    const client = new google.auth.OAuth2({
      clientId: this.clientId,
    });
    client.setCredentials({
      access_token:  this.accessToken,
      refresh_token: this.refreshToken,
      expiry_date:   this.expiryDate,
    });

    client.on('tokens', (tokens) => {
      console.log({ tokens });
      if (tokens.refresh_token) {
        this.refreshToken = tokens.refresh_token;
      }
      if (tokens.access_token) {
        this.accessToken = tokens.access_token;
      }
      if (tokens.expiry_date) {
        this.expiryDate = tokens.expiry_date;
      }
    });

    info('GOOGLE: Authentication to Google Service successful.');

    const youtube = google.youtube({
      auth:    client,
      version: 'v3',
    });

    // get active broadcasts
    const list = await youtube.liveBroadcasts.list({
      part:            ['id','snippet','contentDetails','status'],
      broadcastStatus: 'active ',
    });
    console.log(list.data.items);
  }


  sockets() {
    if (!app) {
      setTimeout(() => this.sockets(), 100);
      return;
    }

    app.get('/api/services/google/privatekeys', adminMiddleware, async (req, res) => {
      res.send({
        data: await getRepository(GooglePrivateKeys).find(),
      });
    });

    app.post('/api/services/google/privatekeys', adminMiddleware, async (req, res) => {
      const data = req.body;
      await getRepository(GooglePrivateKeys).save(data);
      res.send({ data });
    });

    app.delete('/api/services/google/privatekeys/:id', adminMiddleware, async (req, res) => {
      await getRepository(GooglePrivateKeys).delete({ id: req.params.id });
      res.status(404).send();
    });
  }
}

export default new Google();
