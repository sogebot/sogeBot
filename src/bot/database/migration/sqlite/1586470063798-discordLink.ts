import {MigrationInterface, QueryRunner} from 'typeorm';

export class discordLink1586470063798 implements MigrationInterface {
  name = 'discordLink1586470063798';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "discord_link" ("id" varchar PRIMARY KEY NOT NULL, "tag" varchar NOT NULL, "createdAt" bigint NOT NULL, "userId" integer)`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "discord_link"`, undefined);
  }

}
