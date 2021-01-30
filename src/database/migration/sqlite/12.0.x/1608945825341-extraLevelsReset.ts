import { MigrationInterface, QueryRunner } from 'typeorm';

export class extraLevelsReset1608945825341 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    const users = await queryRunner.query(`SELECT "userId", "extra" from "user"`);
    for (const user of users) {
      if (user.extra) {
        const { levels, ...extra }:any = JSON.parse(user.extra);
        if (levels) {
          await queryRunner.query(`UPDATE "user" SET "extra"='${JSON.stringify(extra)}'`);
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
