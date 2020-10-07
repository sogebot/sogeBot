import {MigrationInterface, QueryRunner} from 'typeorm';

export class pollIsOpenedIdx1602070380846 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX "IDX_poll_isOpened" ON "poll" ("isOpened") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_poll_isOpened"`);
  }

}
