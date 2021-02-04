import { MigrationInterface, QueryRunner } from 'typeorm';

export class spotifyBanList1596014060721 implements MigrationInterface {
  name = 'spotifyBanList1596014060721';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `spotify_song_ban` (`spotifyUri` varchar(255) NOT NULL, `title` varchar(255) NOT NULL, `artists` text NOT NULL, PRIMARY KEY (`spotifyUri`)) ENGINE=InnoDB');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `spotify_song_ban`');
  }

}
