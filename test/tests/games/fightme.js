/* global describe it before */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()


require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

const command = '!fightme'

const tests = [
  {
    challenger: { username: 'user1' },
    challenging: { username: '' },
    expected: 'gambling.fightme.notEnoughOptions'
  },
  {
    challenger: { username: 'user1' },
    challenging: { username: 'user1' },
    expected: 'gambling.fightme.cannotFightWithYourself'
  },
  {
    challenger: { username: 'user1' },
    challenging: { username: 'user2' },
    expected: 'gambling.fightme.winner'
  },
  {
    challenger: { username: 'broadcaster' },
    challenging: { username: 'user1' },
    expected: 'gambling.fightme.broadcaster'
  },
  {
    challenger: { username: 'user1' },
    challenging: { username: 'broadcaster' },
    expected: 'gambling.fightme.broadcaster'
  },
  {
    challenger: { username: 'usermod1' },
    challenging: { username: 'user2' },
    expected: 'gambling.fightme.oneModerator'
  },
  {
    challenger: { username: 'user1' },
    challenging: { username: 'usermod2' },
    expected: 'gambling.fightme.oneModerator'
  },
  {
    challenger: { username: 'usermod1' },
    challenging: { username: 'usermod2' },
    expected: 'gambling.fightme.bothModerators'
  }
]

describe('game/fightme - !fightme', () => {
  for (let test of tests) {
    describe(`challenger: ${test.challenger.username} | challenging: ${test.challenging.username} => ${test.expected}`, async () => {
      before(async () => {
        await db.cleanup()
        await message.prepare()

        await global.db.engine.insert('users', { id: '1', username: 'usermod1', is: { moderator: true } })
        await global.db.engine.insert('users', { id: '2', username: 'usermod2', is: { moderator: true } })
      })

      it('Challenger is starting !fightme', async () => {
        global.games.fightme.main({ command, sender: test.challenger, parameters: test.challenging.username })
      })
      if (test.challenging.username.length === 0 || test.challenging.username === test.challenger.username) {
        it(`Expecting ${test.expected}`, async () => {
          await message.isSent(test.expected, test.challenger)
        })
      } else {
        it('Expecting gambling.fightme.challenge', async () => {
          await message.isSent('gambling.fightme.challenge', test.challenger, { username: test.challenging.username, command })
        })
        it('Challenged user is responding !fightme', async () => {
          global.games.fightme.main({ command, sender: test.challenging, parameters: test.challenger.username })
        })
        it(`Expecting ${test.expected}`, async () => {
          await message.isSent(test.expected, test.challenging, [
            { winner: test.challenging.username, loser: test.challenger.username, challenger: test.challenging.username },
            { winner: test.challenger.username, loser: test.challenging.username, challenger: test.challenger.username }
          ])
        })
      }
    })
  }
})
