import { MigrationInterface, QueryRunner } from 'typeorm';

export class eventsUpdate1678892044036 implements MigrationInterface {
  name = 'eventsUpdate1678892044036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_b535fbe8ec6d832dde22065ebd"`);
    await queryRunner.query(`DROP TABLE "event"`);
    await queryRunner.query(`DROP TABLE "event_operation"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
