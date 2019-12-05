import {MigrationInterface, QueryRunner} from 'typeorm';

export class randomizer1575377678628 implements MigrationInterface {
  name = 'randomizer1575377678628';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`CREATE TABLE "randomizer" ("id" varchar PRIMARY KEY NOT NULL, "createdAt" bigint NOT NULL DEFAULT (0), "command" varchar NOT NULL, "permissionId" varchar NOT NULL, "name" varchar NOT NULL, "isShown" boolean NOT NULL DEFAULT (0), "type" varchar(20) NOT NULL DEFAULT ('simple'), "customizationFont" text NOT NULL)`, undefined);
    await queryRunner.query(`CREATE TABLE "randomizer_item" ("id" varchar PRIMARY KEY NOT NULL, "groupId" varchar, "randomizerId" varchar, "name" varchar NOT NULL, "color" varchar(9), "numOfDuplicates" integer NOT NULL DEFAULT (1), "minimalSpacing" integer NOT NULL DEFAULT (1))`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_f4505c5b831084d188f4d1aabc" ON "randomizer_item" ("randomizerId") `, undefined);
    await queryRunner.query(`DROP INDEX "IDX_f4505c5b831084d188f4d1aabc"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_randomizer_item" ("id" varchar PRIMARY KEY NOT NULL, "randomizerId" varchar, "groupId" varchar integer NOT NULL DEFAULT(0), "name" varchar NOT NULL, "color" varchar(9), "numOfDuplicates" integer NOT NULL DEFAULT (1), "minimalSpacing" integer NOT NULL DEFAULT (1), CONSTRAINT "FK_f4505c5b831084d188f4d1aabc7" FOREIGN KEY ("randomizerId") REFERENCES "randomizer" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_randomizer_item"("id", "randomizerId", "groupId", "name", "color", "numOfDuplicates", "minimalSpacing") SELECT "id", "randomizerId", "groupId", "name", "color", "numOfDuplicates", "minimalSpacing" FROM "randomizer_item"`, undefined);
    await queryRunner.query(`DROP TABLE "randomizer_item"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_randomizer_item" RENAME TO "randomizer_item"`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_f4505c5b831084d188f4d1aabc" ON "randomizer_item" ("randomizerId") `, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP INDEX "IDX_f4505c5b831084d188f4d1aabc"`, undefined);
    await queryRunner.query(`ALTER TABLE "randomizer_item" RENAME TO "temporary_randomizer_item"`, undefined);
    await queryRunner.query(`CREATE TABLE "randomizer_item" ("id" varchar PRIMARY KEY NOT NULL, "randomizerId" varchar, "groupId" varchar, "name" varchar NOT NULL, "color" varchar(9), "numOfDuplicates" integer NOT NULL DEFAULT (1), "minimalSpacing" integer NOT NULL DEFAULT (1))`, undefined);
    await queryRunner.query(`INSERT INTO "randomizer_item"("id", "randomizerId", "name", "color", "numOfDuplicates", "minimalSpacing") SELECT "id", "randomizerId", "groupId", "name", "color", "numOfDuplicates", "minimalSpacing" FROM "temporary_randomizer_item"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_randomizer_item"`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_f4505c5b831084d188f4d1aabc" ON "randomizer_item" ("randomizerId") `, undefined);
    await queryRunner.query(`DROP INDEX "IDX_f4505c5b831084d188f4d1aabc"`, undefined);
    await queryRunner.query(`DROP TABLE "randomizer_item"`, undefined);
    await queryRunner.query(`DROP TABLE "randomizer"`, undefined);
  }

}
