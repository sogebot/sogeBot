import {MigrationInterface, QueryRunner} from 'typeorm';

export class discordNameToId1589457395923 implements MigrationInterface {
  name = 'discordNameToId1589457395923';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "discord_link"`, undefined);
    await queryRunner.query(`CREATE TABLE "discord_link" ("id" varchar PRIMARY KEY NOT NULL, "tag" varchar NOT NULL, "discordId" varchar NOT NULL, "createdAt" bigint NOT NULL, "userId" integer)`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "discord_link"`, undefined);
    await queryRunner.query(`CREATE TABLE "discord_link" ("id" varchar PRIMARY KEY NOT NULL, "tag" varchar NOT NULL, "createdAt" bigint NOT NULL, "userId" integer)`, undefined);
  }

}
