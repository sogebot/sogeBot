import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '../../../insertItemIntoTable.js';

export class updateTTSSettings1678892044038 implements MigrationInterface {
  name = 'updateTTSSettings1678892044038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * FROM "settings" WHERE "namespace" = '/core/tts' AND "name" = 'service'`);
    if (items.length === 0) {
      return;
    }
    const service = JSON.parse(items[0].value) as number;

    const randomizers = await queryRunner.query(`SELECT * FROM "randomizer"`);
    for (const randomizer of randomizers) {
      randomizer.tts = JSON.parse(randomizer.tts);
      console.log(`Updating randomizer with id ${randomizer.id} for new TTS settings.`);
      randomizer.tts.selectedService = String(service);
      randomizer.tts.services = {
        [String(service)]: {
          voice:  randomizer.tts.voice,
          volume: randomizer.tts.volume,
          rate:   randomizer.tts.rate,
          pitch:  randomizer.tts.pitch,
        },
      };
      delete randomizer.tts.voice;
      delete randomizer.tts.volume;
      delete randomizer.tts.rate;
      delete randomizer.tts.pitch;
      randomizer.tts = JSON.stringify(randomizer.tts);

      // save back to db
      await queryRunner.query(`DELETE FROM "randomizer" WHERE "id" = '${randomizer.id}'`);
      await insertItemIntoTable('randomizer', randomizer, queryRunner);
    }

    const overlays = await queryRunner.query(`SELECT * FROM "overlay"`);
    for (const overlay of overlays) {
      overlay.items = JSON.parse(overlay.items);
      for (const item of overlay.items) {
        // update TTS overlay
        if (item.opts.typeId === 'tts') {
          console.log(`Updating TTS overlay with id ${item.id} for new TTS settings.`);
          item.opts.selectedService = String(service);
          item.opts.services = {
            [String(service)]: {
              voice:  item.opts.voice,
              volume: item.opts.volume,
              rate:   item.opts.rate,
              pitch:  item.opts.pitch,
            },
          };
          delete item.opts.voice;
          delete item.opts.volume;
          delete item.opts.rate;
          delete item.opts.pitch;
        }

        // update Alert overlay
        if (item.opts.typeId === 'alerts') {
          console.log(`Updating Alert overlay with id ${item.id} for new TTS settings.`);
          item.opts.tts.selectedService = String(service);
          item.opts.tts.services = {
            [String(service)]: {
              voice:  item.opts.tts.voice,
              volume: item.opts.tts.volume,
              rate:   item.opts.tts.rate,
              pitch:  item.opts.tts.pitch,
            },
          };
          delete item.opts.tts.voice;
          delete item.opts.tts.volume;
          delete item.opts.tts.rate;
          delete item.opts.tts.pitch;

          for (const group of item.opts.items) {
            for (const variant of group.variants) {
              for (const component of variant.items) {
                if (component.type === 'tts') {
                  if (component.tts == null) {
                    console.log(`\t== Skipping Alert overlay variant component with id ${component.id} as it is inheriting global value.`);
                    continue;
                  }
                  console.log(`\t== Updating Alert overlay variant component with id ${component.id} for new TTS settings.`);
                  component.tts.selectedService = String(service);
                  component.tts.services = {
                    [String(service)]: {
                      voice:  component.tts.voice,
                      volume: component.tts.volume,
                      rate:   component.tts.rate,
                      pitch:  component.tts.pitch,
                    },
                  };
                  delete component.tts.voice;
                  delete component.tts.volume;
                  delete component.tts.rate;
                  delete component.tts.pitch;
                }
              }
            }
            for (const component of group.items) {
              if (component.type === 'tts') {
                if (component.tts == null) {
                  console.log(`\t== Skipping Alert overlay component with id ${component.id} as it is inheriting global value.`);
                  continue;
                }
                console.log(`\t== Updating Alert overlay component with id ${component.id} for new TTS settings.`);
                component.tts.selectedService = String(service);
                component.tts.services = {
                  [String(service)]: {
                    voice:  component.tts.voice,
                    volume: component.tts.volume,
                    rate:   component.tts.rate,
                    pitch:  component.tts.pitch,
                  },
                };
                delete component.tts.voice;
                delete component.tts.volume;
                delete component.tts.rate;
                delete component.tts.pitch;
              }
            }
          }
        }
      }
      overlay.items = JSON.stringify(overlay.items);

      // save back to db
      await queryRunner.query(`DELETE FROM "overlay" WHERE "id" = '${overlay.id}'`);
      await insertItemIntoTable('overlay', overlay, queryRunner);
    }
    return;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
