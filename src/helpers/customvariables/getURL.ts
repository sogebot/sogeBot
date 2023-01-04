import { Variable } from '@entity/variable';
import { AppDataSource } from '~/database';

import { getValueOf } from './getValueOf';

async function getURL(req: any, res: any) {
  try {
    const variable = (await AppDataSource.getRepository(Variable).find())
      .find(v => {
        return v.urls.find(url => url.id === req.params.id);
      });
    if (variable) {
      if (variable.urls.find(url => url.id === req.params.id)?.GET) {
        return res.status(200).send({ value: await getValueOf(variable.variableName) });
      } else {
        return res.status(403).send({ error: 'This endpoint is not enabled for GET', code: 403 });
      }
    } else {
      return res.status(404).send({ error: 'Variable not found', code: 404 });
    }
  } catch (e: any) /* istanbul ignore next */ {
    res.status(500).send({ error: 'Internal Server Error', code: 500 });
    throw e;
  }
}

export { getURL };