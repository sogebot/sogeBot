
/* global describe it  */

import('../../general.js');
import assert from 'assert';
import songs from '../../../dest/systems/songs.js';

describe('Songs - getSongsIdsFromPlaylist() - @func1', () => {
  describe('Load songs ids', () => {
    let ids = [];
    it(`Load playlist video IDs`, async () => {
      ids = await songs.getSongsIdsFromPlaylist('https://www.youtube.com/playlist?list=PLjpw-QGgMkeDv8N68j2WCMPlmOBH-_Lw2')
    });

    for (const id of ['lm4OJxGQm_E', 'q8Vk8Wx0xJo', 'fugQAnzL1uk']) {
      it(`${id} should be returned by playlist`, async () => {
        assert(ids.includes(id));
      });
    }
  });
});
