import { MigrationInterface, QueryRunner } from 'typeorm';

export class socketsTable1574119661920 implements MigrationInterface {
  name = 'socketsTable1574119661920';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DELETE FROM "settings" WHERE "settings"."namespace"='/core/socket' AND "settings"."name"='socketsTokenAuthList'`, undefined);
    await queryRunner.query(`CREATE TABLE "socket" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" integer NOT NULL, "type" character varying(10) NOT NULL, "accessToken" character varying(36), "refreshToken" character varying(36), "accessTokenTimestamp" bigint NOT NULL DEFAULT 0, "refreshTokenTimestamp" bigint NOT NULL DEFAULT 0, CONSTRAINT "PK_54469a3174932555576d81bd656" PRIMARY KEY ("id"))`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP TABLE "socket"`, undefined);
  }

}
