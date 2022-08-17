import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateCommands1659639416174 implements MigrationInterface {
  name = 'updateCommands1659639416174';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "commands_board"`);
    await queryRunner.query(`DROP TABLE "commands_count"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}