import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeSocket1590199352587 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP TABLE "socket"`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`CREATE TABLE "socket" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" integer NOT NULL, "type" character varying(10) NOT NULL, "accessToken" character varying(36), "refreshToken" character varying(36), "accessTokenTimestamp" bigint NOT NULL DEFAULT 0, "refreshTokenTimestamp" bigint NOT NULL DEFAULT 0, CONSTRAINT "PK_54469a3174932555576d81bd656" PRIMARY KEY ("id"))`, undefined);
  }

}
