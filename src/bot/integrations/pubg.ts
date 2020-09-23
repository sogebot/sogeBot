// bot libraries
import Integration from './_interface';
import { settings, shared, ui } from '../decorators';
import Axios from 'axios';
import { adminEndpoint } from '../helpers/socket';
import { HOUR, MINUTE } from '../constants';
import { onChange, onStartup } from '../decorators/on';
import { info } from '../helpers/log';

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
  @shared(true)
  _lastSeasonIdFetch = 0;

  @settings('stats')
  @ui({ type: 'pubg-stats' }, 'stats')
  rankedGameModeStats = {};
  @shared(true)
  _lastRankedGameModeStats = 0;

  @settings('stats')
  @ui({ type: 'pubg-stats' }, 'stats')
  gameModeStats = {};
  @shared(true)
  _lastGameModeStats = 0;

  constructor() {
    super();

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
            Accept: 'application/vnd.api+json',
          },
        }
      );
      for (const season of request.data.data) {
        if (season.isCurrentSeason) {
          this.seasonId = season.id;
          info(`PUBG: current season set automatically to ${season.id}`);
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
            Accept: 'application/vnd.api+json',
          },
        }
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
              Accept: 'application/vnd.api+json',
            },
          }
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
              Accept: 'application/vnd.api+json',
            },
          }
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
              Accept: 'application/vnd.api+json',
            },
          }
        );
        cb(null, request.data);
      } catch (e) {
        cb(e.message, null);
      }
    });
  }
}

const self = new PUBG();
export default self;
