import { MigrationInterface, QueryRunner } from 'typeorm';

export class schemaAlign1578660698662 implements MigrationInterface {
  name = 'schemaAlign1578660698662';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`CREATE TABLE "temporary_user_tip" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" float NOT NULL, "currency" varchar NOT NULL, "message" text NOT NULL, "tippedAt" bigint NOT NULL DEFAULT (0), "sortAmount" float NOT NULL, "userUserId" integer, CONSTRAINT "FK_36683fb221201263b38344a9880" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_user_tip"("id", "amount", "currency", "message", "tippedAt", "sortAmount", "userUserId") SELECT "id", "amount", "currency", "message", "tippedAt", "sortAmount", "userUserId" FROM "user_tip"`, undefined);
    await queryRunner.query(`DROP TABLE "user_tip"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_user_tip" RENAME TO "user_tip"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_user_bit" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" bigint NOT NULL, "message" text NOT NULL, "cheeredAt" bigint NOT NULL DEFAULT (0), "userUserId" integer, CONSTRAINT "FK_cca96526faa532e7d20a0f775b0" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_user_bit"("id", "amount", "message", "cheeredAt", "userUserId") SELECT "id", "amount", "message", "cheeredAt", "userUserId" FROM "user_bit"`, undefined);
    await queryRunner.query(`DROP TABLE "user_bit"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_user_bit" RENAME TO "user_bit"`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "user_bit" RENAME TO "temporary_user_bit"`, undefined);
    await queryRunner.query(`CREATE TABLE "user_bit" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" bigint NOT NULL, "message" text NOT NULL DEFAULT (''), "cheeredAt" bigint NOT NULL DEFAULT (0), "userUserId" integer, CONSTRAINT "FK_cca96526faa532e7d20a0f775b0" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "user_bit"("id", "amount", "message", "cheeredAt", "userUserId") SELECT "id", "amount", "message", "cheeredAt", "userUserId" FROM "temporary_user_bit"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_user_bit"`, undefined);
    await queryRunner.query(`ALTER TABLE "user_tip" RENAME TO "temporary_user_tip"`, undefined);
    await queryRunner.query(`CREATE TABLE "user_tip" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "amount" float NOT NULL, "currency" varchar NOT NULL, "message" text NOT NULL DEFAULT (''), "tippedAt" bigint NOT NULL DEFAULT (0), "sortAmount" float NOT NULL, "userUserId" integer, CONSTRAINT "FK_36683fb221201263b38344a9880" FOREIGN KEY ("userUserId") REFERENCES "user" ("userId") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
    await queryRunner.query(`INSERT INTO "user_tip"("id", "amount", "currency", "message", "tippedAt", "sortAmount", "userUserId") SELECT "id", "amount", "currency", "message", "tippedAt", "sortAmount", "userUserId" FROM "temporary_user_tip"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_user_tip"`, undefined);
  }

}
