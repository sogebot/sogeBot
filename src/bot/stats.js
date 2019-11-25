'use strict'
var _ = require('lodash')

const { TwitchStats } = require('./database/entity/twitch');
const { getRepository } = require('typeorm');
const { error } = require('./helpers/log');
const panel = require('./panel');
import { adminEndpoint } from './helpers/socket';

let _self = null;

function Stats () {
  this.latestTimestamp = 0
  this.sockets()
}

Stats.prototype.sockets = function () {
  adminEndpoint('/', 'getLatestStats', async function (cb) {
    try {
      const statsFromDb = await getRepository(TwitchStats)
        .createQueryBuilder('stats')
        .offset(1)
        .limit(Number.MAX_SAFE_INTEGER)
        .where('stats.whenOnline > :whenOnline', { whenOnline: Date.now() - (1000 * 60 * 60 * 24 * 31) })
        .orderBy('stats.whenOnline', 'DESC')
        .getMany();
      let stats = {
        currentViewers: 0,
        currentSubscribers: 0,
        currentBits: 0,
        currentTips: 0,
        chatMessages: 0,
        currentFollowers: 0,
        currentViews: 0,
        maxViewers: 0,
        currentHosts: 0,
        newChatters: 0,
        currentWatched: 0
      };
      if (statsFromDb.length > 0) {
        let i = 0
        for (let stat of statsFromDb) {
          stats.currentViewers += _self.parseStat(stat.currentViewers)
          stats.currentBits += _self.parseStat(stat.currentBits)
          stats.currentTips += _self.parseStat(stat.currentTips)
          stats.chatMessages += _self.parseStat(stat.chatMessages)
          stats.maxViewers += _self.parseStat(stat.maxViewers)
          stats.newChatters += _self.parseStat(stat.newChatters)
          stats.currentHosts += _self.parseStat(stat.currentHosts)
          stats.currentWatched += _self.parseStat(stat.currentWatched)
          if (i === 0) {
            // get only latest
            stats.currentFollowers = stat.currentFollowers;
            stats.currentViews = stat.currentViews;
            stats.currentSubscribers = stat.currentSubscribers;
          }
          i++
        }
        stats.currentViewers = Number(parseFloat(stats.currentViewers / statsFromDb.length).toFixed(0));
        stats.currentBits = Number(parseFloat(stats.currentBits / statsFromDb.length).toFixed(0));
        stats.currentTips = Number(parseFloat(stats.currentTips / statsFromDb.length).toFixed(2));
        stats.chatMessages = Number(parseFloat(stats.chatMessages / statsFromDb.length).toFixed(0));
        stats.maxViewers = Number(parseFloat(stats.maxViewers / statsFromDb.length).toFixed(0));
        stats.newChatters = Number(parseFloat(stats.newChatters / statsFromDb.length).toFixed(0));
        stats.currentHosts = Number(parseFloat(stats.currentHosts / statsFromDb.length).toFixed(0));
        stats.currentWatched = Number(parseFloat(stats.currentWatched / statsFromDb.length).toFixed(0));
      } else stats = {}
      cb(stats);
    } catch (e) {
      error(e);
      cb({});
    };
  });
}

Stats.prototype.save = async function (data) {
  if (data.timestamp - this.latestTimestamp >= 30000) {
    let stats = await getRepository(TwitchStats).findOne({'whenOnline': new Date(data.whenOnline).getTime() })
    if (stats) {
      // pseudo avg value through stream
      stats.currentViewers = Math.round((data.currentViewers + stats.currentViewers) / 2);
      stats.currentHosts = Math.round((data.currentHosts + stats.currentHosts) / 2);
    } else {
      stats = new TwitchStats();
      stats.whenOnline = new Date(data.whenOnline).getTime();
      stats.currentViewers = data.currentViewers;
      stats.currentHosts = data.currentHosts;
    }
    stats.currentSubscribers = data.currentSubscribers;
    stats.currentBits = data.currentBits;
    stats.currentTips = data.currentTips;
    stats.chatMessages = data.chatMessages;
    stats.currentFollowers = data.currentFollowers;
    stats.currentViews = data.currentViews;
    stats.maxViewers = data.maxViewers;
    stats.newChatters = data.newChatters;
    stats.currentWatched = data.currentWatched;
    await getRepository(TwitchStats).save(stats);

    this.latestTimestamp = data.timestamp;
  }
}

Stats.prototype.parseStat = function (value) {
  return parseFloat(_.isNil(value) || isNaN(parseFloat(value)) ? 0 : value)
}

_self = new Stats();
export default _self;
