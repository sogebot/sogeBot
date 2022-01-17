import { MigrationInterface, QueryRunner } from 'typeorm';

export class addOptionalQueueMessage1642423183106 implements MigrationInterface {
  name = 'addOptionalQueueMessage1642423183106';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_7401b4e0c30f5de6621b38f7a0"`);
    await queryRunner.query(`CREATE TABLE "temporary_queue" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" bigint NOT NULL, "username" varchar NOT NULL, "isModerator" boolean NOT NULL, "isSubscriber" boolean NOT NULL, "isFollower" boolean NOT NULL, "message" varchar)`);
    await queryRunner.query(`DROP TABLE "queue"`);
    await queryRunner.query(`ALTER TABLE "temporary_queue" RENAME TO "queue"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7401b4e0c30f5de6621b38f7a0" ON "queue" ("username") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_7401b4e0c30f5de6621b38f7a0"`);
    await queryRunner.query(`ALTER TABLE "queue" RENAME TO "temporary_queue"`);
    await queryRunner.query(`CREATE TABLE "queue" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" bigint NOT NULL, "username" varchar NOT NULL, "isModerator" boolean NOT NULL, "isSubscriber" boolean NOT NULL, "isFollower" boolean NOT NULL)`);
    await queryRunner.query(`DROP TABLE "temporary_queue"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7401b4e0c30f5de6621b38f7a0" ON "queue" ("username") `);
  }

}
