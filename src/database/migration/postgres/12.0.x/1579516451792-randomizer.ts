import { MigrationInterface, QueryRunner } from 'typeorm';

export class randomizer1579516451792 implements MigrationInterface {
  name = 'randomizer1579516451792';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`CREATE TABLE "randomizer" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" bigint NOT NULL DEFAULT 0, "command" character varying NOT NULL, "isShown" boolean NOT NULL DEFAULT false, "type" character varying(20) NOT NULL DEFAULT 'simple', "customizationFont" text NOT NULL, "permissionId" character varying NOT NULL, "name" character varying NOT NULL, "widgetOrder" integer NOT NULL, CONSTRAINT "PK_027539f48a550dda46773420ad7" PRIMARY KEY ("id"))`, undefined);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_randomizer_cmdunique" ON "randomizer" ("command") `, undefined);
    await queryRunner.query(`CREATE TABLE "randomizer_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "randomizerId" uuid, "groupId" character varying, "name" character varying NOT NULL, "color" character varying(9), "numOfDuplicates" integer NOT NULL DEFAULT 1, "minimalSpacing" integer NOT NULL DEFAULT 1, CONSTRAINT "PK_14948f077878dd238f5490f33ec" PRIMARY KEY ("id"))`, undefined);
    await queryRunner.query(`ALTER TABLE "randomizer_item" ADD CONSTRAINT "FK_f4505c5b831084d188f4d1aabc7" FOREIGN KEY ("randomizerId") REFERENCES "randomizer"("id") ON DELETE CASCADE ON UPDATE CASCADE`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "randomizer_item" DROP CONSTRAINT "FK_f4505c5b831084d188f4d1aabc7"`, undefined);
    await queryRunner.query(`DROP TABLE "randomizer_item"`, undefined);
    await queryRunner.query(`DROP INDEX "idx_randomizer_cmdunique"`, undefined);
    await queryRunner.query(`DROP TABLE "randomizer"`, undefined);
  }

}
