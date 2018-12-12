'use strict'

// 3rdparty libraries
const _ = require('lodash')

// bot libraries
var constants = require('../constants')
const Expects = require('../expects.js')
const System = require('./_interface')

enum ERROR {
  NOT_ENOUGH_OPTIONS,
  NO_VOTING_IN_PROGRESS,
  INVALID_VOTE_TYPE,
  INVALID_VOTE,
  ALREADY_OPENED,
  ALREADY_CLOSED
}

declare type VoteType = {
  _id?: any,
  vid: string,
  votedBy: string,
  votes: number,
  option: number,
}

declare type VotingType = {
  _id?: any,
  type: 'tips' | 'bits' | 'normal',
  title: string,
  isOpened: boolean,
  options: Array<string>
}

/*
 * !vote
 * !vote [x]
 * !vote open [-tips/-bits/-points] -title "your vote title" option | option | option
 * !vote close
 */

class Voting extends System {
  constructor () {
    const options: InterfaceSettings = {
      settings: {
        commands: [
          { name: '!vote', isHelper: true },
          { name: '!vote open', permission: constants.MODS },
          { name: '!vote close', permission: constants.MODS }
        ]
      },
      on: {
        tip: (tip): void => this.parseTip(tip.message),
        bit: (bit): void => this.parseBit(bit.message)
      }
    }

    super(options)
  }

  async close (opts: CommandOptions): Promise<boolean> {
    const cVote: VotingType = await global.db.engine.findOne(this.collection.data, { isOpened: true })

    try {
      if (!_.isEmpty(cVote)) { throw new Error(String(ERROR.ALREADY_CLOSED)) }
      else {
        const votes: Array<VoteType> = await global.db.engine.find(this.collection.votes, { vid: String(cVote._id) })
        await global.db.engine.update(this.collection.data, { _id: String(cVote._id) }, { isOpened: false })

        let count = {}
        let _total = 0
        for (let i = 0, length = votes.length; i < length; i++) {
          if (!count[votes[i].option]) count[votes[i].option] = votes[i].votes
          else count[votes[i].option] = count[votes[i].option] + votes[i].votes
          _total = _total + votes[i].votes
        }
        // get vote status
        global.commons.sendMessage(global.commons.prepare('systems.voting.status_closed', {
          title: cVote.title
        }), opts.sender)
        for (let index in cVote.options) {
          setTimeout(() => {
            const option = cVote.options[index]
            const votes = count[index] || 0
            if (cVote.type === "normal") global.commons.sendMessage(this.settings.commands['!vote'] + ` ${Number(index) + 1} - ${option} - ${votes} ${global.commons.getLocalizedName(votes, 'systems.voting.votes')}, ${Number((100 / _total) * votes).toFixed(2)}%`, opts.sender)
            else global.commons.sendMessage(`#vote${Number(index) + 1} - ${option} - ${votes} ${global.commons.getLocalizedName(votes, 'systems.voting.votes')}, ${Number((100 / _total) * votes).toFixed(2)}`, opts.sender)
          }, 100 * (Number(index) + 1))
        }
      }
    } catch (e) {
      switch (e.message) {
        case String(ERROR.ALREADY_CLOSED):
          global.commons.sendMessage(global.translate('systems.voting.notInProgress'), opts.sender)
          break
      }
    }
    return true
  }

  async open (opts: CommandOptions): Promise<boolean> {
    const cVote: VotingType = await global.db.engine.findOne(this.collection.data, { isOpened: true })

    try {
      if (!_.isEmpty(cVote)) { throw new Error(String(ERROR.ALREADY_OPENED)) }

      let [type, title, options] = new Expects(opts.parameters)
        .switch({ name: 'type', values: ['tips', 'bits'], optional: true, default: 'normal' })
        .argument({ name: 'title', optional: false, multi: true })
        .list({ delimiter: '|' })
        .toArray()
      if (options.length < 2) throw new Error(String(ERROR.NOT_ENOUGH_OPTIONS))

      let voting: VotingType = { type, title, isOpened: true, options }
      await global.db.engine.insert(this.collection.data, voting)

      const translations = `systems.voting.opened_${type}`
      global.commons.sendMessage(global.commons.prepare(translations, {
        title: title,
        command: this.settings.commands['!vote']
      }), opts.sender)
      for (let index in options) {
        setTimeout(() => {
          if (type === 'normal') global.commons.sendMessage(this.settings.commands['!vote'] + ` ${(Number(index) + 1)} => ${options[index]}`, opts.sender)
          else global.commons.sendMessage(`#vote${(Number(index) + 1)} => ${options[index]}`, opts.sender)
        }, 100 * (Number(index) + 1))
      }
      return true
    } catch (e) {
      switch (e.message) {
        case String(ERROR.NOT_ENOUGH_OPTIONS):
          global.commons.sendMessage(global.translate('voting.notEnoughOptions'), opts.sender)
          break
        case String(ERROR.ALREADY_OPENED):
          const translations = 'systems.voting.opened' + (cVote.type.length > 0 ? `_${cVote.type}` : '')
          global.commons.sendMessage(global.commons.prepare(translations, {
            title: cVote.title,
            command: this.settings.commands['!vote']
          }), opts.sender)
          for (let index in cVote.options) {
            setTimeout(() => {
              if (cVote.type === 'normal') global.commons.sendMessage(this.settings.commands['!vote'] + ` ${index} => ${cVote.options[index]}`, opts.sender)
              else global.commons.sendMessage(`#vote${(Number(index) + 1)} => ${cVote.options[index]}`, opts.sender)
            }, 100 * (Number(index) + 1))
          }
          break
        default:
          global.log.warning(e.stack)
          global.commons.sendMessage(global.translate('core.error'), opts.sender)
      }
      return false
    }
  }

  async main (opts: CommandOptions): Promise<void> {
    const cVote: VotingType = await global.db.engine.findOne(this.collection.data, { isOpened: true })
    let index: number

    try {
      if (opts.parameters.length === 0 && !_.isEmpty(cVote)) {
        const votes: Array<VoteType> = await global.db.engine.find(this.collection.votes, { vid: String(cVote._id) })

        let count = {}
        let _total = 0
        for (let i = 0, length = votes.length; i < length; i++) {
          if (!count[votes[i].option]) count[votes[i].option] = votes[i].votes
          else count[votes[i].option] = count[votes[i].option] + votes[i].votes
          _total = _total + votes[i].votes
        }
        // get vote status
        global.commons.sendMessage(global.commons.prepare('systems.voting.status', {
          title: cVote.title
        }), opts.sender)
        for (let index in cVote.options) {
          setTimeout(() => {
            const option = cVote.options[index]
            const votes = count[index] || 0
            if (cVote.type === "normal") global.commons.sendMessage(this.settings.commands['!vote'] + ` ${Number(index) + 1} - ${option} - ${votes} ${global.commons.getLocalizedName(votes, 'systems.voting.votes')}, ${Number((100 / _total) * votes).toFixed(2)}%`, opts.sender)
            else global.commons.sendMessage(`#vote${Number(index) + 1} - ${option} - ${votes} ${global.commons.getLocalizedName(votes, 'systems.voting.votes')}, ${Number((100 / _total) * votes).toFixed(2)}`, opts.sender)
          }, 100 * (Number(index) + 1))
        }


      } else if (_.isEmpty(cVote)) { throw new Error(String(ERROR.NO_VOTING_IN_PROGRESS)) }
      else if (cVote.type === 'normal') {
        // we expects number
        [index] = new Expects(opts.parameters)
          .number()
          .toArray()
        index = index - 1
        if (cVote.options.length < index || index < 0) throw new Error(String(ERROR.INVALID_VOTE))
        else {
          let vote: VoteType = {
            vid: String(cVote._id),
            votedBy: opts.sender.username,
            votes: 1,
            option: index
          }
          global.db.engine.update(this.collection.votes, { vid: vote.vid, votedBy: vote.votedBy }, vote)
        }
      } else throw new Error(String(ERROR.INVALID_VOTE_TYPE))
    } catch (e) {
      switch (e.message) {
        case String(ERROR.NO_VOTING_IN_PROGRESS):
          global.commons.sendMessage(global.commons.prepare('systems.voting.notInProgress'), opts.sender)
          break
        case String(ERROR.INVALID_VOTE):
          // pass, we don't want to have error message
          break
      }
    }
  }
}

module.exports = new Voting()
