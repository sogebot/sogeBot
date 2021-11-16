import { MigrationInterface, QueryRunner } from 'typeorm';

export class fixIncorrectGoalTypes1632608140511 implements MigrationInterface {
  name = 'fixIncorrectGoalTypes1632608140511';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const data = await queryRunner.query('SELECT * FROM goal');
    await queryRunner.query('DELETE FROM goal WHERE 1=1');
    for (const item of data) {
      // expecting     '{"color":"#00aa00","backgroundColor":"#e9ecef","borderColor":"#000000","borderPx":0,"height":50}'
      // sometimes got '"{\\"color\\":\\"#00aa00\\",\\"backgroundColor\\":\\"#e9ecef\\",\\"borderColor\\":\\"#000000\\",\\"borderPx\\":0,\\"height\\":50}"'
      if (item.customizationBar.startsWith('"')) {
        item.customizationBar = JSON.parse(item.customizationBar);
      }
      if (item.customizationFont.startsWith('"')) {
        item.customizationFont = JSON.parse(item.customizationFont);
      }

      const keys = Object.keys(item);
      // resave reparsed
      await queryRunner.query(
        `INSERT INTO "goal"(${keys.map(o => `"${o}"`).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
        keys.map(key => item[key]),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }
}
