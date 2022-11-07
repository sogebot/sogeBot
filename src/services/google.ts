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
