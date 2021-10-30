import { defaultsDeep } from 'lodash';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class addMissingAttributes1635453652531 implements MigrationInterface {
  name = 'addMissingAttributes1635453652531';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query('SELECT * FROM overlay_mapper', undefined);
    for (const item of items) {
      let opts: Record<string, any> = {};
      if(['credits'].includes(item.value)) {
        opts = JSON.parse(item.opts);
        for (const item2 of opts.customTexts) {
          delete item2.text;
          if (typeof item2.right === 'undefined') {
            item2.right = '';
          }
          if (typeof item2.left === 'undefined') {
            item2.left = '';
          }
          if (typeof item2.middle === 'undefined') {
            item2.middle = '';
          }
        }
        if (typeof opts.clips.play === 'undefined') {
          opts.clips.play = true;
        }

        opts.text = defaultsDeep(opts.text || {}, {
          lastMessage:      '',
          lastSubMessage:   '',
          streamBy:         '',
          follow:           '',
          host:             '',
          raid:             '',
          cheer:            '',
          sub:              '',
          resub:            '',
          subgift:          '',
          subcommunitygift: '',
          tip:              '',
        });

        opts.show = defaultsDeep(opts.show || {}, {
          follow:           true,
          host:             true,
          raid:             true,
          sub:              true,
          subgift:          true,
          subcommunitygift: true,
          resub:            true,
          cheer:            true,
          clips:            true,
          tip:              true,
        });
      }
      if(['clips'].includes(item.value)) {
        opts = JSON.parse(item.opts);
        if (typeof opts.filter === 'undefined') {
          opts.filter = 'none';
        }
        if (typeof opts.showLabel === 'undefined') {
          opts.showLabel = false;
        }
      }
      if(['alerts'].includes(item.value)) {
        opts = JSON.parse(item.opts);
        if (!opts) {
          opts = {
            galleryCache:          false,
            galleryCacheLimitInMb: 50,
          };
        }
        if (typeof opts.galleryCache === 'undefined') {
          opts.galleryCache = false;
        }
      }

      const keys = Object.keys(item);
      item.opts = JSON.stringify(opts);
      await queryRunner.query('DELETE FROM "overlay_mapper" WHERE id=?', [item.id]);
      await queryRunner.query(
        `INSERT INTO "overlay_mapper"(${keys.map(o => `"${o}"`).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
        [keys.map(key => item[key])],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
