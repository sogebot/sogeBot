import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTags1666167883937 implements MigrationInterface {
  name = 'updateTags1666167883937';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cache_titles" ADD "tags" text NOT NULL`);
    await queryRunner.query(`DROP TABLE "twitch_tag_localization_name"`);
    await queryRunner.query(`DROP TABLE "twitch_tag_localization_description"`);
    await queryRunner.query(`DROP TABLE "twitch_tag"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
