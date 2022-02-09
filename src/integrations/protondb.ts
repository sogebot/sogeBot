import puppeteer from 'puppeteer';

import { command, default_permission } from '../decorators';
import Expects from '../expects';
import System from './_interface';

import {
  stats,
} from '~/helpers/api';
import { prepare } from '~/helpers/commons';
import { defaultPermissions } from '~/helpers/permissions/index';

class ProtonDB extends System {
  @command('!pdb')
  @default_permission(defaultPermissions.CASTERS)
  async getGameInfo(opts: CommandOptions): Promise<CommandResponse[]> {
    let [gameInput] = new Expects(opts.parameters)
      .everything({ optional: true })
      .toArray();

    if (!gameInput) {
      if (!stats.value.currentGame) {
        return []; // skip if we don't have game
      } else {
        gameInput = stats.value.currentGame;
      }
    }

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`https://www.protondb.com/search?q=${encodeURIComponent(gameInput)}`, { waitUntil: 'networkidle0' });

    const [link] = await page.$x(`//a[contains(translate(.,
                                      'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                                      'abcdefghijklmnopqrstuvwxyz'), '${gameInput.toLowerCase()}')]`);
    if (link) {
      const ratingXPath = `//*[@id="root"]/div[1]/main/div/div/div[2]/div/div[3]/span`;
      await link.click();
      await page.waitForXPath(ratingXPath);
      const [rating] = await page.$x(ratingXPath);

      const natively = await page.$x(`//*[@id="root"]/div[1]/main/div/div/div[4]/div/i`);
      if (rating && natively.length > 0) {
        const ratingText = await rating.evaluate(element => element.textContent) || '❓';

        const native: string[] = [];
        if (await natively[0].evaluate(element => (element as HTMLElement).style.opacity === '1')) {
          native.push('Linux');
        }
        if (await natively[1].evaluate(element => (element as HTMLElement).style.opacity === '1')) {
          native.push('Mac');
        }
        if (await natively[2].evaluate(element => (element as HTMLElement).style.opacity === '1')) {
          native.push('Windows');
        }

        await browser.close();
        return [{
          response: prepare('integrations.protondb.responseOk', {
            game:   gameInput.toUpperCase(),
            rating: ratingText,
            native: native.join(', '),
            url:    page.url(),
          }),
          ...opts,
        }];
      } else {
        await browser.close();
        return [{
          response: prepare('integrations.protondb.responseNg', {
            game: gameInput.toUpperCase(),
          }),
          ...opts,
        }];
      }

    } else {
      await browser.close();
      return [{
        response: prepare('integrations.protondb.responseNotFound', {
          game: gameInput.toUpperCase(),
        }),
        ...opts,
      }];
    }
  }
}

export default new ProtonDB();
