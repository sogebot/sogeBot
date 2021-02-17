import { MigrationInterface, QueryRunner } from 'typeorm';

export class twitchStatsRemoveHosts1613554160927 implements MigrationInterface {
  name = 'twitchStatsRemoveHosts1613554160927';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "twitch_stats" DROP COLUMN "currentHosts"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "twitch_stats" ADD "currentHosts" integer NOT NULL DEFAULT '0'`);
  }

}