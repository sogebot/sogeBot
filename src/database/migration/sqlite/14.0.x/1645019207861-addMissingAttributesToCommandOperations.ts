import { MigrationInterface, QueryRunner } from 'typeorm';

export class addMissingAttributesToCommandOperations1645019207861 implements MigrationInterface {
  name = 'addMissingAttributesToCommandOperations1645019207861';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const event_operation = await queryRunner.query(`SELECT * from "event_operation" WHERE "name"='run-command'`);
    for (const event of event_operation) {
      const definitions = JSON.stringify({
        ...JSON.parse(event.definitions) as Record<string, any>,
        timeout:     0,
        timeoutType: 'normal',
      });
      await queryRunner.query(`UPDATE "event_operation" SET "definitions"=? WHERE "id"=?`,
        [definitions, event.id]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
