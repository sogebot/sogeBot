<template>
  <div class="stream-info-container container-fluid" :class="{ 'sticky-top': b_sticky }" :style="{ 'top': b_sticky ? '50px' : undefined }">
    <template v-if="!isLoaded">
      <div class="mx-auto text-center p-3 pt-4">
        <div class="spinner-grow" role="status"></div>
      </div>
    </template>
    <template v-else>
      <div class="row">
        <div class="col-sm stream-info" @click="saveHighlight">
          <h2>
            <span>{{ translate('uptime') }}</span>
            <small>{{ translate('click-to-highlight') }}</small>
          </h2>
          <span class="data" id="uptime">{{ uptime }}</span>
          <span class="stats">&nbsp;</span>
        </div>

        <div class="col-sm stream-info" v-on:click="toggleViewerShow">
          <h2>
            <span>{{ translate('viewers') }}</span>
            <small>{{ translate('click-to-toggle-display') }}</small>
          </h2>
          <span class="data">
            <template v-if="!hideStats">{{ currentViewers }}</template>
            <small v-else>{{translate('hidden')}}</small>
          </span>
          <span class="stats">&nbsp;</span>
        </div>

        <div class="col-sm stream-info" v-on:click="toggleViewerShow">
          <h2>
            <span>{{ translate('max-viewers') }}</span>
            <small>{{ translate('click-to-toggle-display') }}</small>
          </h2>
          <span class="data">
            <template v-if="!hideStats">{{ maxViewers }}</template>
            <small v-else>{{translate('hidden')}}</small>
          </span>
          <span class="stats" v-html="difference(averageStats.maxViewers, maxViewers)"></span>
        </div>

        <div class="col-sm stream-info" v-on:click="toggleViewerShow">
          <h2>
            <span>{{ translate('new-chatters') }}</span>
            <small>{{ translate('click-to-toggle-display') }}</small>
          </h2>
          <span class="data">
            <template v-if="!hideStats">{{ newChatters }}</template>
            <small v-else>{{translate('hidden')}}</small>
          </span>
          <span class="stats" v-html="difference(averageStats.newChatters, newChatters)"></span>
        </div>

        <div class="col-sm stream-info">
          <h2>{{ translate('chat-messages') }}</h2>
          <span class="data" v-bind:title="chatMessages">{{ shortenNumber(chatMessages, b_shortenNumber) }}</span>
          <span class="stats" v-html="difference(averageStats.chatMessages, chatMessages)"></span>
        </div>

        <div class="col-sm stream-info">
          <h2>{{ translate('views') }}</h2>
          <span class="data" v-bind:title="currentViews">{{ shortenNumber(currentViews, b_shortenNumber) }}</span>
          <span class="stats" v-html="difference(averageStats.currentViews, currentViews)"></span>
        </div>

        <div class="col-sm stream-info">
          <h2>{{ translate('hosts') }}</h2>
          <span class="data">{{ currentHosts }}</span>
          <span class="stats" id="curHostsChange">&nbsp;</span>
        </div>

        <div class="col-sm stream-info">
          <h2>{{ translate('followers') }}</h2>
          <span class="data" v-bind:title="currentFollowers">{{ shortenNumber(currentFollowers, b_shortenNumber) }}</span>
          <span class="stats" v-html="difference(averageStats.currentFollowers, currentFollowers)"></span>
        </div>

        <div class="col-sm stream-info">
          <h2>{{ translate('subscribers') }}</h2>
          <template v-if="broadcasterType !== ''">
            <span class="data">{{ currentSubscribers }}</span>
            <span class="stats" v-html="difference(averageStats.currentSubscribers, currentSubscribers)"></span>
          </template>
          <template v-else>
            <span class="data text-muted" style="font-size:0.7rem;">{{ translate('not-affiliate-or-partner') }}</span>
          </template>
        </div>

        <div class="col-sm stream-info">
          <h2>{{ translate('bits') }}</h2>
          <template v-if="broadcasterType !== ''">
            <span class="data" v-bind:title="currentBits">{{ shortenNumber(currentBits, b_shortenNumber) }}</span>
            <span class="stats" v-html="difference(averageStats.currentBits, currentBits)"></span>
          </template>
          <template v-else>
            <span class="data text-muted" style="font-size:0.7rem;">{{ translate('not-affiliate-or-partner') }}</span>
          </template>
        </div>

        <div class="col-sm stream-info">
          <h2>{{ translate('tips') }}</h2>
          <span class="data">{{ Number(currentTips).toFixed(2) }}</span><span class="data ml-0 pl-0">{{ currency }}</span>
          <span class="stats" v-html="difference(averageStats.currentTips, currentTips, false, currency)"></span>
        </div>

        <div class="col-sm stream-info">
          <h2>{{ translate('watched-time') }}</h2>
          <span class="data">{{ Number(currentWatched / 1000 / 60 / 60).toFixed(1) }}h</span>
          <span class="stats" v-html="difference(averageStats.currentWatched / 1000 / 60 / 60, currentWatched / 1000 / 60 / 60, false, 'h', 1)"></span>
        </div>
      </div>

      <div class="row">
        <div class="col-md stream-info" @click="showGameAndTitleDlg">
          <h2>
            <span>{{ translate('game') }}</span>
            <small>{{ translate('click-to-change') }}</small>
          </h2>
          <span class="data" v-if="game" :title="game">{{ game }}</span>
          <span  class="data" v-else>{{ translate('not-available') }}</span>
        </div>

        <div class="col stream-info" @click="showGameAndTitleDlg">
          <h2>
            <span>{{ translate('title') }}</span>
            <small>{{ translate('click-to-change') }}</small>
          </h2>
          <span class="data" v-if="title" :title="rawStatus" v-html="title"></span>
          <span class="data" v-else>{{ translate('not-available') }}</span>
        </div>

        <div class="col stream-info" @click="showGameAndTitleDlg">
          <h2>
            <span>{{ translate('tags') }}</span>
            <small>{{ translate('click-to-change') }}</small>
          </h2>
          <span class="data">
            <span v-if="tags.length === 0">{{translate('not-available')}}</span>
            <span v-else>
              <small v-for="tag of filterTags(true)" :key="tag.name"
                :class="{ 'text-muted': tag.is_auto }" :title="tag.is_auto ? 'Automatically added tag' : 'Manual tag'">
                {{ tag.name }}
              </small>
              <span v-for="tag of filterTags(false)" :key="tag.name"
                :class="{ 'text-muted': tag.is_auto }" :title="tag.is_auto ? 'Automatically added tag' : 'Manual tag'">
                {{ tag.name }}
              </span>
            </span>
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import io from 'socket.io-client';
  import _ from 'lodash';

  import { EventBus } from '../helpers/event-bus';

  export default Vue.extend({
    data: function () {
      const object: {
        socket: any,
        highlightsSocket: any,

        averageStats: any,
        hideStats: boolean,
        b_shortenNumber: boolean,
        b_showAvgDiff: boolean,
        b_percentage: boolean,
        b_sticky: boolean,
        timestamp: null | number,
        uptime: string,
        currentViewers: number,
        maxViewers: number,
        chatMessages: number,
        newChatters: number,
        currentHosts: number,
        currentViews: number,
        currentBits: number,
        currentWatched: number,
        currentSubscribers: number,
        currentFollowers: number,
        currentTips: number,
        currency: string,
        broadcasterType: string,
        tags: any[],
        isLoaded: boolean,

        title: string | null,
        game: string | null,
        rawStatus: string,
        cachedTitle: string,
      } = {
        socket: io({ query: "token=" + this.token }),
        highlightsSocket: io('/systems/highlights', { query: "token=" + this.token }),
        averageStats: {},

        hideStats: false,
        b_shortenNumber: true,
        b_showAvgDiff: false,
        b_percentage: false,
        b_sticky: false,

        timestamp: null,
        uptime: '--:--:--',
        currentViewers: 0,
        maxViewers: 0,
        chatMessages: 0,
        newChatters: 0,
        currentHosts: 0,
        currentViews: 0,
        currentBits: 0,
        currentWatched: 0,
        currentSubscribers: 0,
        currentFollowers: 0,
        currentTips: 0,
        currency: 'n/a',
        broadcasterType: '',
        tags: [],

        title: null,
        game: null,
        rawStatus: '',
        cachedTitle: '',

        isLoaded: false,
      }
      return object
    },
    mounted() {
      this.b_percentage = this.configuration.core.ui.percentage
      this.b_showAvgDiff = this.configuration.core.ui.showdiff
      this.b_shortenNumber = this.configuration.core.ui.shortennumbers
      this.b_sticky = this.configuration.core.ui.stickystats
    },
    watch: {
      timestamp() {
        if (this.uptime === '') this.uptime = '00:00:00'
        if (this.uptime === '00:00:00') {
          this.currentViewers = 0
          this.maxViewers = 0
          this.chatMessages = 0
          this.newChatters = 0
          this.currentHosts = 0
        }
      }
    },
    methods: {
      showGameAndTitleDlg: function () {
        EventBus.$emit('show-game_and_title_dlg');
      },
      loadCustomVariableValue: async function (variable) {
        return new Promise((resolve, reject) => {
          this.socket.emit('custom.variable.value', variable, (err, value) => {
            resolve(value)
          })
        })
      },
      generateTitle: async function (current, raw) {
        if (raw.length === 0) return current

        let variables = raw.match(/(\$_[a-zA-Z0-9_]+)/g)
        if (this.cachedTitle === current && _.isNil(variables)) {
          return this.cachedTitle
        }

        if (!_.isNil(variables)) {
          for (let variable of variables) {
            let value = await this.loadCustomVariableValue(variable)
            raw = raw.replace(variable, `<strong style="border-bottom: 1px dotted gray" data-toggle="tooltip" data-placement="bottom" title="${variable}">${value}</strong>`)
          }
        }
        this.cachedTitle = raw
        return raw
      },
      shortenNumber: function (number, shortify) {
        if (!shortify || Number(number) <= 10000) return number
        var SI_PREFIXES = ["", "k", "M", "G", "T", "P", "E"];
        // what tier? (determines SI prefix)
        var tier = Math.log10(number) / 3 | 0;
        // if zero, we don't need a prefix
        if(tier == 0) return number;
        // get prefix and determine scale
        var prefix = SI_PREFIXES[tier];
        var scale = Math.pow(10, tier * 3);
        // scale the number
        var scaled = number / scale;
        // format number and add prefix as suffix
        return scaled.toFixed(1) + prefix;
      },
      saveHighlight() {
        this.highlightsSocket.emit('highlight')
      },
      filterTags (is_auto) {
        return this.tags.filter(o => o.is_auto === is_auto).map((o) => {
          const lang = _.get(this.configuration, 'lang', 'en')
          const localekey  = Object.keys(o.localization_names).find((l) => l.includes(lang))
          if (localekey) {
            return { name: o.localization_names[localekey], is_auto: o.is_auto }
          }
        }).sort((a, b) => {
          if ((a || { name: ''}).name < (b || { name: ''}).name)  { //sort string ascending
            return -1;
          }
          if ((a || { name: ''}).name > (b || { name: ''}).name) {
            return 1;
          }
          return 0; //default return value (no sorting)
        });
      },
      difference: function (number, current, shorten, postfix, toFixed) {
        postfix = postfix || ''
        shorten = typeof shorten === 'undefined' ? true : shorten
        number = number || 0
        if (_.isNaN(Number(current)) || this.uptime === '00:00:00' || !this.b_showAvgDiff) return '' // return nothing if current is not number (hidden, etc)
        else if (number === 0) return ''
        else {
          let isPositive = current - number >= 0
          let f_difference: number | string = Math.abs(this.b_percentage ? (Math.round((current - number) / number * 1000) / 10) : current - number)
          if (this.b_percentage) {
            f_difference = Number(f_difference).toFixed(1)
            f_difference = `${f_difference}%`
          } else {
            if (shorten) {
              f_difference = this.shortenNumber(f_difference, this.b_shortenNumber)
            }
            if (toFixed) {
              f_difference = Number(f_difference).toFixed(toFixed)
            }
            f_difference = f_difference + postfix
          }

          if (current - number === 0) {
            return ''
          } else if (isPositive) {
            return `<small class="stats-up text-success"><i class="fas fa-caret-up"></i>${f_difference}</small>`
          } else {
            return `<small class="stats-down text-danger"><i class="fas fa-caret-down"></i>${f_difference}</small>`
          }
        }
      },
      toggleViewerShow: function () {
        this.hideStats = !this.hideStats
      }
    },
    created: function () {
      this.socket.emit('getLatestStats')
      this.socket.emit('panel.sendStreamData')

      setInterval(() => {
        this.socket.emit('getLatestStats')
        this.socket.emit('panel.sendStreamData')
      }, 1000)

      this.socket.on('latestStats', (data) => { this.averageStats = data })
      this.socket.on('stats', async (data) => {
        for (let [key, value] of Object.entries(data)) {
          this[key] = value // populate data
        }
        this.timestamp = Date.now()
        this.isLoaded = true

        this.title = await this.generateTitle(data.status, data.rawStatus);
        this.rawStatus = data.rawStatus;
        this.game = data.game;
      })
    }
  })
</script>

<style scoped>
</style>