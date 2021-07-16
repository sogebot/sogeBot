import { MigrationInterface, QueryRunner } from 'typeorm';

export class cooldownRemoveLastTimestamp1590334525683 implements MigrationInterface {
  name = 'cooldownRemoveLastTimestamp1590334525683';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_aa85aa267ec6eaddf7f93e3665"`);
    await queryRunner.query(`CREATE TABLE "temporary_cooldown" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "miliseconds" integer NOT NULL, "type" varchar(10) NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0), "isErrorMsgQuiet" boolean NOT NULL, "isEnabled" boolean NOT NULL, "isOwnerAffected" boolean NOT NULL, "isModeratorAffected" boolean NOT NULL, "isSubscriberAffected" boolean NOT NULL, "isFollowerAffected" boolean NOT NULL)`);
    await queryRunner.query(`INSERT INTO "temporary_cooldown"("id", "name", "miliseconds", "type", "timestamp", "isErrorMsgQuiet", "isEnabled", "isOwnerAffected", "isModeratorAffected", "isSubscriberAffected", "isFollowerAffected") SELECT "id", "name", "miliseconds", "type", "timestamp", "isErrorMsgQuiet", "isEnabled", "isOwnerAffected", "isModeratorAffected", "isSubscriberAffected", "isFollowerAffected" FROM "cooldown"`);
    await queryRunner.query(`DROP TABLE "cooldown"`);
    await queryRunner.query(`ALTER TABLE "temporary_cooldown" RENAME TO "cooldown"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_aa85aa267ec6eaddf7f93e3665" ON "cooldown" ("name") `);
    await queryRunner.query(`CREATE TABLE "temporary_cooldown_viewer" ("id" varchar PRIMARY KEY NOT NULL, "userId" integer NOT NULL, "timestamp" bigint NOT NULL, "cooldownId" varchar, CONSTRAINT "FK_5ba6ccf5a51426111e322c80445" FOREIGN KEY ("cooldownId") REFERENCES "cooldown" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "temporary_cooldown_viewer"("id", "userId", "timestamp", "cooldownId") SELECT "id", "userId", "timestamp", "cooldownId" FROM "cooldown_viewer"`);
    await queryRunner.query(`DROP TABLE "cooldown_viewer"`);
    await queryRunner.query(`ALTER TABLE "temporary_cooldown_viewer" RENAME TO "cooldown_viewer"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cooldown_viewer" RENAME TO "temporary_cooldown_viewer"`);
    await queryRunner.query(`CREATE TABLE "cooldown_viewer" ("id" varchar PRIMARY KEY NOT NULL, "userId" integer NOT NULL, "timestamp" bigint NOT NULL, "lastTimestamp" bigint NOT NULL, "cooldownId" varchar, CONSTRAINT "FK_5ba6ccf5a51426111e322c80445" FOREIGN KEY ("cooldownId") REFERENCES "cooldown" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
    await queryRunner.query(`INSERT INTO "cooldown_viewer"("id", "userId", "timestamp", "cooldownId") SELECT "id", "userId", "timestamp", "cooldownId" FROM "temporary_cooldown_viewer"`);
    await queryRunner.query(`DROP TABLE "temporary_cooldown_viewer"`);
    await queryRunner.query(`DROP INDEX "IDX_aa85aa267ec6eaddf7f93e3665"`);
    await queryRunner.query(`ALTER TABLE "cooldown" RENAME TO "temporary_cooldown"`);
    await queryRunner.query(`CREATE TABLE "cooldown" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "miliseconds" integer NOT NULL, "type" varchar(10) NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0), "lastTimestamp" bigint NOT NULL DEFAULT (0), "isErrorMsgQuiet" boolean NOT NULL, "isEnabled" boolean NOT NULL, "isOwnerAffected" boolean NOT NULL, "isModeratorAffected" boolean NOT NULL, "isSubscriberAffected" boolean NOT NULL, "isFollowerAffected" boolean NOT NULL)`);
    await queryRunner.query(`INSERT INTO "cooldown"("id", "name", "miliseconds", "type", "timestamp", "isErrorMsgQuiet", "isEnabled", "isOwnerAffected", "isModeratorAffected", "isSubscriberAffected", "isFollowerAffected") SELECT "id", "name", "miliseconds", "type", "timestamp", "isErrorMsgQuiet", "isEnabled", "isOwnerAffected", "isModeratorAffected", "isSubscriberAffected", "isFollowerAffected" FROM "temporary_cooldown"`);
    await queryRunner.query(`DROP TABLE "temporary_cooldown"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_aa85aa267ec6eaddf7f93e3665" ON "cooldown" ("name") `);
  }

}
