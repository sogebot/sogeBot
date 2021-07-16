import { MigrationInterface, QueryRunner } from 'typeorm';

export class discordAddId1589457395923 implements MigrationInterface {
  name = 'discordAddId1589457395923';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "discord_link"`, undefined);
    await queryRunner.query(`CREATE TABLE "discord_link" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tag" character varying NOT NULL, "discordId" character varying NOT NULL, "createdAt" bigint NOT NULL, "userId" integer, CONSTRAINT "PK_51c82ec49736e25315b01dad663" PRIMARY KEY ("id"))`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "discord_link"`, undefined);
  }

}
