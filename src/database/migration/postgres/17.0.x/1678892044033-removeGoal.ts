import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeGoal1678892044033 implements MigrationInterface {
  name = 'removeGoal1678892044033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "goal"`);
    await queryRunner.query(`DROP TABLE "goal_group"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
