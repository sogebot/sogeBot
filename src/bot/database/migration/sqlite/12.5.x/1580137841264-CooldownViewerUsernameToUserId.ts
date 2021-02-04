import { MigrationInterface, QueryRunner } from 'typeorm';

export class CooldownViewerUsernameToUserId1580137841264 implements MigrationInterface {
  name = 'CooldownViewerUsernameToUserId1580137841264';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP TABLE "cooldown_viewer"`, undefined);
    await queryRunner.query(`CREATE TABLE "cooldown_viewer" ("id" varchar PRIMARY KEY NOT NULL, "userId" integer NOT NULL, "timestamp" bigint NOT NULL, "lastTimestamp" bigint NOT NULL, "cooldownId" varchar, CONSTRAINT "FK_5ba6ccf5a51426111e322c80445" FOREIGN KEY ("cooldownId") REFERENCES "cooldown" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP TABLE "cooldown_viewer"`, undefined);
    await queryRunner.query(`CREATE TABLE "cooldown_viewer" ("id" varchar PRIMARY KEY NOT NULL, "username" varchar NOT NULL, "timestamp" bigint NOT NULL, "lastTimestamp" bigint NOT NULL, "cooldownId" varchar, CONSTRAINT "FK_5ba6ccf5a51426111e322c80445" FOREIGN KEY ("cooldownId") REFERENCES "cooldown" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`, undefined);
  }

}
