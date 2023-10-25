import assert from 'assert';

require('../../general.js');
import { db } from '../../general.js';
const user = require('../../general.js').user;

describe('checkFilter should properly parse $param in stream - https://discord.com/channels/317348946144002050/317349069024395264/963386192089460767 - @func2', () => {
  before(async () => {
    await db.cleanup();
    await user.prepare();
  });

  it('returns correct value - true filter', async () => {
    const { checkFilter } = require('../../../dest/helpers/checkFilter');
    assert(await checkFilter({ parameters: 'test', sender: user.viewer }, '"(stream|$param|link)" === "twitch.tv/test"'));
    assert(await checkFilter({ parameters: 'test', sender: user.viewer }, '"(stream|$touser|link)" === "twitch.tv/test"'));
  });

  it('returns correct value - false filter', async () => {
    const { checkFilter } = require('../../../dest/helpers/checkFilter');
    assert(!(await checkFilter({ parameters: 'test2', sender: user.viewer }, '"(stream|$param|link)" === "twitch.tv/test"')));
    assert(!(await checkFilter({ parameters: 'test2', sender: user.viewer }, '"(stream|$touser|link)" === "twitch.tv/test"')));
  });
});
