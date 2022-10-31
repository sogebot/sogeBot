import { getRepository } from 'typeorm';
import { GooglePrivateKeys } from '~/database/entity/google';
import { app } from '~/helpers/panel';
import { adminMiddleware } from '~/socket';
import Service from './_interface';

class Google extends Service {
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

  }
}

export default new Google();
