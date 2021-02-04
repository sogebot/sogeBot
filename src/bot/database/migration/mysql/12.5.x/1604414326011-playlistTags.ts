import { MigrationInterface, QueryRunner } from 'typeorm';

export class playlistTags1604414326011 implements MigrationInterface {
  name = 'playlistTags1604414326011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const playlist = await queryRunner.query(`SELECT * from \`song_playlist\``);
    await queryRunner.query(`DROP TABLE \`song_playlist\``);
    await queryRunner.query('CREATE TABLE `song_playlist` (`videoId` varchar(255) NOT NULL, `lastPlayedAt` bigint NOT NULL DEFAULT 0, `seed` float NOT NULL, `title` varchar(255) NOT NULL, `loudness` float NOT NULL, `length` int NOT NULL, `forceVolume` tinyint NOT NULL DEFAULT 0, `volume` int NOT NULL, `startTime` int NOT NULL, `endTime` int NOT NULL, `tags` text NOT NULL, PRIMARY KEY (`videoId`)) ENGINE=InnoDB', undefined);
    for (const item of playlist) {
      await queryRunner.query(
        'INSERT INTO `song_playlist`(`videoId`, `lastPlayedAt`, `seed`, `title`, `length`, `loudness`, `forceVolume`, `volume`, `startTime`, `endTime`, `tags`) values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [item.videoId, item.lastPlayedAt, item.seed, item.title, item.length, item.loudness, item.forceVolume, item.volume, item.startTime, item.endTime, 'general'],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `song_playlist` DROP COLUMN `tags`');
  }

}
