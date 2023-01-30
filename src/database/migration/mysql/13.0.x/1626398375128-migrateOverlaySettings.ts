import { set } from 'lodash';
import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class migrateOverlaySettings1626383147273 implements MigrationInterface {
  name = 'migrateOverlaySettings1626383147273';

  public async up(queryRunner: QueryRunner): Promise < void > {
    return;
    const settings = (await queryRunner.manager.getRepository(`settings`).find()).filter((o: any) => o.namespace.includes('overlay'));
    const mapper = await queryRunner.query(`SELECT * from "overlay_mapper"`);

    // check if alert overlay exists
    const alerts = mapper.filter((o: any) => o.value === 'alerts');
    if (alerts.length > 0) {
      let opts: Record < string, any > = {};
      const alertsSettings = settings.filter((o: any) => o.namespace === '/overlays/alerts') as any;
      for (const item of alertsSettings) {
        await queryRunner.manager.getRepository(`settings`).remove(item);
        opts = {
          ...opts,
          [item.name]: JSON.parse(item.value),
        };
      }

      if (Object.keys(opts).length > 0) {
        for (const item of alerts) {
          await queryRunner.manager.getRepository(`overlay_mapper`).save({
            ...(item as any),
            opts,
          });
        }
      }
    }

    // check if clips overlay exists
    const clips = mapper.filter((o: any) => o.value === 'clips');
    if (clips.length > 0) {
      let opts: Record < string, any > = {};
      const clipsSettings = settings.filter((o: any) => o.namespace === '/overlays/clips') as any;
      for (const item of clipsSettings) {
        await queryRunner.manager.getRepository(`settings`).remove(item);
        if (item.name === 'cClipsVolume') {
          item.name = 'volume';
        }
        if (item.name === 'cClipsFilter') {
          item.name = 'filter';
        }
        if (item.name === 'cClipsLabel' || item.name === 'showLabel') {
          item.name = 'label';
        }
        opts = {
          ...opts,
          [item.name]: JSON.parse(item.value),
        };
      }
      if (Object.keys(opts).length > 0) {
        for (const item of clips) {
          await queryRunner.manager.getRepository(`overlay_mapper`).save({
            ...(item as any),
            opts,
          });
        }
      }
    }

    // check if clipscarousel overlay exists
    const clipscarousel = mapper.filter((o: any) => o.value === 'clipscarousel');
    if (clipscarousel.length > 0) {
      let opts: Record < string, any > = {};
      const clipscarouselSettings = settings.filter((o: any) => o.namespace === '/overlays/clipscarousel') as any;
      for (const item of clipscarouselSettings) {
        await queryRunner.manager.getRepository(`settings`).remove(item);
        if (item.name === 'cClipsTimeToNextClip') {
          continue;
        }
        if (item.name === 'cClipsCustomPeriodInDays') {
          item.name = 'customPeriod';
        }
        if (item.name === 'cClipsNumOfClips') {
          item.name = 'numOfClips';
        }
        opts = {
          ...opts,
          [item.name]: JSON.parse(item.value),
        };
      }
      if (Object.keys(opts).length > 0) {
        for (const item of clipscarousel) {
          await queryRunner.manager.getRepository(`overlay_mapper`).save({
            ...(item as any),
            opts,
          });
        }
      }
    }

    // check if clipscarousel overlay exists
    const credits = mapper.filter((o: any) => o.value === 'credits');
    if (credits.length > 0) {
      const opts: Record < string, any > = {};
      const creditsSettings = settings.filter((o: any) => o.namespace === '/overlays/credits') as any;
      for (const item of creditsSettings) {
        await queryRunner.manager.getRepository(`settings`).remove(item);
        if (item.name === 'cCreditsSpeed') {
          opts.speed = JSON.parse(item.value);
        }
        if (item.name === 'cShowFollowers') {
          set(opts, 'show.follow', JSON.parse(item.value));
        }
        if (item.name === 'cShowHosts') {
          set(opts, 'show.host', JSON.parse(item.value));
        }
        if (item.name === 'cShowRaids') {
          set(opts, 'show.raid', JSON.parse(item.value));
        }
        if (item.name === 'cShowSubscribers') {
          set(opts, 'show.sub', JSON.parse(item.value));
        }
        if (item.name === 'cShowSubgifts') {
          set(opts, 'show.subgift', JSON.parse(item.value));
        }
        if (item.name === 'cShowSubcommunitygifts') {
          set(opts, 'show.subcommunitygift', JSON.parse(item.value));
        }
        if (item.name === 'cShowResubs') {
          set(opts, 'show.resub', JSON.parse(item.value));
        }
        if (item.name === 'cShowCheers') {
          set(opts, 'show.cheer', JSON.parse(item.value));
        }
        if (item.name === 'cShowClips') {
          set(opts, 'show.clips', JSON.parse(item.value));
        }
        if (item.name === 'cShowTips') {
          set(opts, 'show.tip', JSON.parse(item.value));
        }
        if (item.name === 'cTextLastMessage') {
          set(opts, 'text.lastMessage', JSON.parse(item.value));
        }
        if (item.name === 'cTextLastSubMessage') {
          set(opts, 'text.lastSubMessage', JSON.parse(item.value));
        }
        if (item.name === 'cTextStreamBy') {
          set(opts, 'text.streamBy', JSON.parse(item.value));
        }
        if (item.name === 'cTextFollow') {
          set(opts, 'text.follow', JSON.parse(item.value));
        }
        if (item.name === 'cTextHost') {
          set(opts, 'text.host', JSON.parse(item.value));
        }
        if (item.name === 'cTextRaid') {
          set(opts, 'text.raid', JSON.parse(item.value));
        }
        if (item.name === 'cTextCheer') {
          set(opts, 'text.cheer', JSON.parse(item.value));
        }
        if (item.name === 'cTextSub') {
          set(opts, 'text.sub', JSON.parse(item.value));
        }
        if (item.name === 'cTextResub') {
          set(opts, 'text.resub', JSON.parse(item.value));
        }
        if (item.name === 'cTextSubgift') {
          set(opts, 'text.subgift', JSON.parse(item.value));
        }
        if (item.name === 'cTextSubcommunitygift') {
          set(opts, 'text.subcommunitygift', JSON.parse(item.value));
        }
        if (item.name === 'cTextTip') {
          set(opts, 'text.tip', JSON.parse(item.value));
        }
        if (item.name === 'cCustomTextsValues') {
          opts.customTexts = JSON.parse(item.value);
        }
        if (item.name === 'cSocialValues') {
          opts.social = JSON.parse(item.value);
        }
        if (item.name === 'cClipsShouldPlay') {
          set(opts, 'clips.play', JSON.parse(item.value));
        }
        if (item.name === 'cClipsPeriod') {
          set(opts, 'clips.period', JSON.parse(item.value));
        }
        if (item.name === 'cClipsCustomPeriodInDays') {
          set(opts, 'clips.periodValue', JSON.parse(item.value));
        }
        if (item.name === 'cClipsNumOfClips') {
          set(opts, 'clips.numOfClips', JSON.parse(item.value));
        }
        if (item.name === 'cClipsVolume') {
          set(opts, 'clips.volume', JSON.parse(item.value));
        }
      }
      if (Object.keys(opts).length > 0) {
        for (const item of credits) {
          await queryRunner.manager.getRepository(`overlay_mapper`).save({
            ...(item as any),
            opts,
          });
        }
      }
    }

    // check if polls overlay exists
    const polls = mapper.filter((o: any) => o.value === 'polls');
    if (polls.length > 0) {
      let opts: Record < string, any > = {};
      const pollsSettings = settings.filter((o: any) => o.namespace === '/overlays/polls') as any;
      for (const item of pollsSettings) {
        await queryRunner.manager.getRepository(`settings`).remove(item);
        if (item.name === 'cDisplayTheme') {
          item.name = 'theme';
        }
        if (item.name === 'cDisplayHideAfterInactivity') {
          item.name = 'hideAfterInactivity';
        }
        if (item.name === 'cDisplayInactivityTime') {
          item.name = 'inactivityTime';
        }
        if (item.name === 'cDisplayAlign') {
          item.name = 'align';
        }
        opts = {
          ...opts,
          [item.name]: JSON.parse(item.value),
        };
      }
      if (Object.keys(opts).length > 0) {
        for (const item of polls) {
          await queryRunner.manager.getRepository(`overlay_mapper`).save({
            ...(item as any),
            opts,
          });
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise < void > {
    return;
  }

}
