// bot libraries

import { HOUR, MINUTE } from '@sogebot/ui-helpers/constants';
import Axios from 'axios';
import { escapeRegExp } from 'lodash';

import {
  command, persistent, settings, ui,
} from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import Expects from '../expects';
import { prepare } from '../helpers/commons';
import { flatten } from '../helpers/flatten';
import { error, info } from '../helpers/log';
import { adminEndpoint } from '../helpers/socket';
import Message from '../message';
import Integration from './_interface';

class PUBG extends Integration {
  @settings()
  @ui({ type: 'text-input', secret: true })
  apiKey = '';

  @settings('player')
  @ui({ type: 'selector', values: ['steam', 'console', 'kakao', 'psn', 'stadia', 'xbox'] })
  platform: 'steam' | 'console' | 'kakao' | 'psn' | 'stadia' | 'xbox' = 'steam';
  @settings('player')
  playerName = '';
  @settings('player')
  @ui({ type: 'pubg-player-id' }, 'player')
  playerId = '';
  @settings('player')
  @ui({ type: 'pubg-season-id' }, 'player')
  seasonId = '';
  @persistent()
  _lastSeasonIdFetch = 0;

  @settings('customization')
  rankedGameModeStatsCustomization = 'Rank: $currentTier.tier $currentTier.subTier ($currentRankPoint) | Wins: $wins ((toPercent|1|$winRatio)%) | Top 10: (toPercent|1|$top10Ratio)% | Avg. Rank: (toFloat|1|$avgRank) | KDA: (toFloat|1|$kda)';
  @settings('customization')
  gameModeStatsCustomization = 'Wins: $wins | Top 10: $top10s';

  @settings('stats')
  rankedGameModeStats: { [x: string]: any } = {};
  @persistent()
  _lastRankedGameModeStats = 0;

  @settings('stats')
  gameModeStats: { [x: string]: any } = {};
  @persistent()
  _lastGameModeStats = 0;

  @onStartup()
  onStartup() {
    setInterval(() => {
      if (this._lastSeasonIdFetch > HOUR) {
        this.fetchSeasonId();
      }
      if (this._lastRankedGameModeStats > 10 * MINUTE) {
        this.fetchUserStats(true);
      }
      if (this._lastGameModeStats > 10 * MINUTE) {
        this.fetchUserStats(false);
      }
    }, MINUTE);
  }

  @onChange('apiKey')
  @onChange('enabled')
  @onChange('platform')
  @onStartup()
  async fetchSeasonId() {
    if (this.enabled && this.apiKey.length > 0) {
      this._lastSeasonIdFetch = Date.now();
      const request = await Axios.get(
        `https://api.pubg.com/shards/${this.platform}/seasons`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            Accept:        'application/vnd.api+json',
          },
        },
      );
      for (const season of request.data.data) {
        if (season.attributes.isCurrentSeason) {
          this.seasonId = season.id;
          if (this.seasonId !== season.id) {
            info(`PUBG: current season set automatically to ${season.id}`);
          }
        }
      }
    }
  }
  @onChange('enabled')
  @onChange('platform')
  @onStartup()
  async fetchUserStats(ranked = false) {
    if (this.enabled && this.apiKey.length > 0 && this.seasonId.length > 0 && this.playerId.length > 0) {
      if (ranked) {
        this._lastRankedGameModeStats = Date.now();
      } else {
        this._lastGameModeStats = Date.now();
      }
      const request = await Axios.get(
        ranked ? `https://api.pubg.com/shards/${this.platform}/players/${this.playerId}/seasons/${this.seasonId}/ranked` : `https://api.pubg.com/shards/${this.platform}/players/${this.playerId}/seasons/${this.seasonId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            Accept:        'application/vnd.api+json',
          },
        },
      );
      if (ranked) {
        this.rankedGameModeStats = request.data.data.attributes.rankedGameModeStats;
      } else {
        this.gameModeStats = request.data.data.attributes.gameModeStats;
      }
    }
  }

  sockets() {
    adminEndpoint(this.nsp, 'pubg::searchForseasonId', async ({ apiKey, platform }, cb) => {
      try {
        const request = await Axios.get(
          `https://api.pubg.com/shards/${platform}/seasons`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept:        'application/vnd.api+json',
            },
          },
        );
        for (const season of request.data.data) {
          if (season.attributes.isCurrentSeason) {
            cb(null, { data: [season] });
          }
        }
        throw new Error('No current season found.');
      } catch (e) {
        cb(e.message, null);
      }
    });
    adminEndpoint(this.nsp, 'pubg::getUserStats', async ({ apiKey, platform, playerId, seasonId, ranked }, cb) => {
      try {
        const request = await Axios.get(
          ranked ? `https://api.pubg.com/shards/${platform}/players/${playerId}/seasons/${seasonId}/ranked` : `https://api.pubg.com/shards/${platform}/players/${playerId}/seasons/${seasonId}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept:        'application/vnd.api+json',
            },
          },
        );
        if (ranked) {
          this.rankedGameModeStats = request.data.data.attributes.rankedGameModeStats;
        } else {
          this.gameModeStats = request.data.data.attributes.gameModeStats;
        }
        cb(null, request.data.data.attributes[ranked ? 'rankedGameModeStats' : 'gameModeStats']);
      } catch (e) {
        cb(e.message, null);
      }
    });
    adminEndpoint(this.nsp, 'pubg::searchForPlayerId', async ({ apiKey, platform, playerName }, cb) => {
      try {
        const request = await Axios.get(
          `https://api.pubg.com/shards/${platform}/players?filter[playerNames]=${playerName}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept:        'application/vnd.api+json',
            },
          },
        );
        cb(null, request.data);
      } catch (e) {
        cb(e.message, null);
      }
    });
    adminEndpoint(this.nsp, 'pubg::exampleParse', async ({ text }, cb) => {
      try {
        const messageToSend = await new Message(text).parse() as string;
        cb(null, messageToSend);
      } catch (e) {
        cb(e.message, null);
      }
    });
  }

  @command('!pubg normal')
  async showGameModeStats(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const gameType = new Expects(opts.parameters).everything().toArray()[0] as string;
      if (typeof this.gameModeStats[gameType] === 'undefined') {
        throw new Error('Expected parameter');
      }
      let text = this.gameModeStatsCustomization;
      for (const key of Object.keys(flatten(this.gameModeStats[gameType]))) {
        text = text.replace(new RegExp(escapeRegExp(`$${key}`), 'gi'), flatten(this.gameModeStats[gameType])[key]);
      }
      return [{ response: await new Message(`$sender, ${text}`).parse(), ...opts }];
    } catch (e) {
      if (e.message.includes('Expected parameter')) {
        return [{ response: prepare('integrations.pubg.expected_one_of_these_parameters', { list: Object.keys(this.gameModeStats).join(', ') }), ...opts }];
      } else {
        error(e.stack);
        return [];
      }
    }
  }

  @command('!pubg ranked')
  async showRankedGameModeStats(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const gameType = new Expects(opts.parameters).everything().toArray()[0] as string;
      if (typeof this.rankedGameModeStats[gameType] === 'undefined') {
        throw new Error('Expected parameter');
      }
      let text = this.rankedGameModeStatsCustomization;
      for (const key of Object.keys(flatten(this.rankedGameModeStats[gameType]))) {
        text = text.replace(new RegExp(escapeRegExp(`$${key}`), 'gi'), flatten(this.rankedGameModeStats[gameType])[key]);
      }
      return [{ response: await new Message(`$sender, ${text}`).parse(), ...opts }];
    } catch (e) {
      if (e.message.includes('Expected parameter')) {
        return [{ response: prepare('integrations.pubg.expected_one_of_these_parameters', { list: Object.keys(this.rankedGameModeStats).join(', ') }), ...opts }];
      } else {
        error(e.stack);
        return [];
      }
    }
  }
}

const self = new PUBG();
export default self;
