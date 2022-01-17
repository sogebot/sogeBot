import { MigrationInterface, QueryRunner } from 'typeorm';

export class mergeClipEvents1641559036883 implements MigrationInterface {
  name = 'mergeClipEvents1641559036883';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const operations = await queryRunner.query(`SELECT * FROM "event_operation"`);

    for (const operation of operations) {
      if (operation.name === 'create-a-clip') {
        await queryRunner.query(`DELETE FROM "event_operation" WHERE "id"=$1`, [operation.id]);
        const keys = Object.keys(operation);
        operation.definitions = JSON.stringify({
          ...(JSON.parse(operation.definitions) as Record<string, any>),
          replay: false,
        });
        await queryRunner.query(`INSERT INTO "event_operation" (${keys.map(o => `${o}`).join(', ')}) values (${keys.map((o, idx) => `$${idx+1}`).join(', ')})`,
          keys.map(o => operation[o]));
      }

      if (operation.name === 'create-a-clip-and-play-replay') {
        await queryRunner.query(`DELETE FROM "event_operation" WHERE "id"=$1`, [operation.id]);
        const keys = Object.keys(operation);
        operation.name = 'create-a-clip';
        operation.definitions = JSON.stringify({
          ...(JSON.parse(operation.definitions) as Record<string, any>),
          replay: true,
        });
        await queryRunner.query(`INSERT INTO "event_operation" (${keys.map(o => `${o}`).join(', ')}) values (${keys.map((o, idx) => `$${idx+1}`).join(', ')})`,
          keys.map(o => operation[o]));
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
