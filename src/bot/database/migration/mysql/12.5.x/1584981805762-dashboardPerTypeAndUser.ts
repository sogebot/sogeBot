import {
  MigrationInterface, QueryRunner, TableColumn, 
} from 'typeorm';

let broadcasterId: null | number = null;

const columnUserIdWithoutDefault = new TableColumn({ type: 'int', name: 'userId' });
const columnTypeWithoutDefault = new TableColumn({
  type: 'varchar', name: 'type', length: '6', 
});

export class dashboardPerTypeAndUser1584981805762 implements MigrationInterface {
  name = 'dashboardPerTypeAndUser1584981805762';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // get channelId
    try {
      try {
        broadcasterId = Number(JSON.parse((await queryRunner.query('SELECT `value` from `settings` WHERE `namespace` = "/core/oauth" AND `name` = "broadcasterId"', undefined))[0].value));
      } catch (e) {
        throw new Error('broadcasterId');
      }

      const columnUserId = new TableColumn({
        type: 'int', default: broadcasterId, name: 'userId', 
      });
      const columnType = new TableColumn({
        type: 'varchar', default: '\'admin\'', name: 'type', length: '6', 
      });

      const widgets = await queryRunner.query('SELECT * from `widget` WHERE `dashboardId` IS NOT NULL');

      // add new columns with default values
      await queryRunner.addColumns('dashboard', [
        columnUserId, columnType,
      ]);

      // remove default values
      await queryRunner.changeColumn('dashboard', 'userId', columnUserIdWithoutDefault);
      await queryRunner.changeColumn('dashboard', 'type', columnTypeWithoutDefault);

      await queryRunner.query('DELETE FROM `widget` WHERE 1=1');
      for (const widget of widgets) {
        await queryRunner.query(
          'INSERT INTO `widget`(`id`, `name`, `positionX`, `positionY`, `height`, `width`, `dashboardId`) values(?, ?, ?, ?, ?, ? ,?)',
          [widget.id, widget.name, widget.positionX, widget.positionY, widget.height, widget.width, widget.dashboardId]);
      }
    } catch (e) {
      if (e.message !== 'broadcasterId') {
        throw new Error(e);
      }
      await queryRunner.query('DELETE FROM `widget` WHERE 1=1');
      await queryRunner.query('DELETE FROM `dashboard` WHERE 1=1');
      // add new columns without default values
      await queryRunner.addColumns('dashboard', [
        columnUserIdWithoutDefault, columnTypeWithoutDefault,
      ]);
    }

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('dashboard', 'userId');
    await queryRunner.dropColumn('dashboard', 'type');
  }

}
