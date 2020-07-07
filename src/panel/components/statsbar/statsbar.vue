<template>
  <div class="stream-info-container container-fluid" :class="{ 'sticky-top': b_sticky }" :style="{ 'top': b_sticky ? top + 'px' : undefined }" ref="quickwindow">
    <b-toast :title="error.name" visible variant="danger" v-for="error of errors" :key="error.name + error.message">
      {{ error.message }}
    </b-toast>
    <b-toast title="Owner and broadcaster oauth is not set" no-auto-hide visible variant="danger" solid v-if="!configuration.isCastersSet">
      Please set your <a href="#/settings/core/oauth">broadcaster oauth or owners</a>, or all users <strong>will have access</strong> to this dashboard and will be considered as <strong>casters</strong>.
    </b-toast>
    <b-toast title="New update available" visible variant="info" solid v-if="update.version">
      New bot version {{ update.version }} available at <a :href="'https://github.com/sogehige/sogeBot/releases/tag/' + update.version">GitHub</a>.
    </b-toast>
    <template v-if="!isLoaded">
      <div class="mx-auto text-center p-3 pt-4">
        <div class="spinner-grow" role="status"></div>
      </div>
    </template>
    <template v-else>
      <div class="row">
        <div class="col-6 col-sm-4 col-md-4 col-lg-1 stream-info" @click="saveHighlight">
          <span class="data" id="uptime">{{ uptime }}</span>
          <span class="stats">&nbsp;</span>
          <h2>
            <span>{{ translate('uptime') }}</span>
            <small>{{ translate('click-to-highlight') }}</small>
          </h2>
        </div>

        <div class="col-6 col-sm-4 col-md-4 col-lg-1 stream-info" v-on:click="toggleViewerShow">
          <span class="data">
            <template v-if="!hideStats">{{ isStreamOnline ? currentViewers : 0 }}</template>
            <small v-else>{{translate('hidden')}}</small>
          </span>
          <span class="stats">&nbsp;</span>
          <h2>
            <span>{{ translate('viewers') }}</span>
            <small>{{ translate('click-to-toggle-display') }}</small>
          </h2>
        </div>

        <div class="col-6 col-sm-4 col-md-4 col-lg-1 stream-info" v-on:click="toggleViewerShow">
          <span class="data">
            <template v-if="!hideStats">{{ isStreamOnline ? maxViewers : 0 }}</template>
            <small v-else>{{translate('hidden')}}</small>
          </span>
          <span class="stats" v-if="!hideStats">
            <small v-if="b_showAvgDiff && isStreamOnline && maxViewers - averageStats.maxViewers !== 0"
                   :class="{
                     'text-success': maxViewers - averageStats.maxViewers > 0,
                     'stats-up': maxViewers - averageStats.maxViewers > 0,
                     'text-danger': maxViewers - averageStats.maxViewers < 0,
                     'stats-down': maxViewers - averageStats.maxViewers < 0,
                   }">
              <template v-if="maxViewers - averageStats.maxViewers !== 0">
                <fa :icon="maxViewers - averageStats.maxViewers > 0 ? 'caret-up' : 'caret-down'"/>
                <span>{{difference(averageStats.maxViewers, maxViewers)}}</span>
              </template>
            </small>
          </span>
          <span class="stats" v-else>&nbsp;</span>
          <h2>
            <span>{{ translate('max-viewers') }}</span>
            <small>{{ translate('click-to-toggle-display') }}</small>
          </h2>
        </div>

        <div class="col-6 col-sm-4 col-md-4 col-lg-1 stream-info" v-on:click="toggleViewerShow">
          <span class="data">
            <template v-if="!hideStats">{{ isStreamOnline ? newChatters : 0 }}</template>
            <small v-else>{{translate('hidden')}}</small>
          </span>
          <span class="stats" v-if="!hideStats">
            <small v-if="b_showAvgDiff && isStreamOnline && newChatters - averageStats.newChatters !== 0"
                   :class="{
                     'text-success': newChatters - averageStats.newChatters > 0,
                     'stats-up': newChatters - averageStats.newChatters > 0,
                     'text-danger': newChatters - averageStats.newChatters < 0,
                     'stats-down': newChatters - averageStats.newChatters < 0,
                   }">
              <template v-if="newChatters - averageStats.newChatters !== 0">
                <fa :icon="newChatters - averageStats.newChatters > 0 ? 'caret-up' : 'caret-down'"/>
                <span>{{difference(averageStats.newChatters, newChatters)}}</span>
              </template>
            </small>
          </span>
          <span class="stats" v-else>&nbsp;</span>
          <h2>
            <span>{{ translate('new-chatters') }}</span>
            <small>{{ translate('click-to-toggle-display') }}</small>
          </h2>
        </div>

        <div class="col-6 col-sm-4 col-md-4 col-lg-1 stream-info">
          <span class="data" v-bind:title="chatMessages">{{ isStreamOnline ? shortenNumber(chatMessages, b_shortenNumber) : 0 }}</span>
          <span class="stats">
            <small v-if="b_showAvgDiff && isStreamOnline && chatMessages - averageStats.chatMessages !== 0"
                   :class="{
                     'text-success': chatMessages - averageStats.chatMessages > 0,
                     'stats-up': chatMessages - averageStats.chatMessages > 0,
                     'text-danger': chatMessages - averageStats.chatMessages < 0,
                     'stats-down': chatMessages - averageStats.chatMessages < 0,
                   }">
              <template v-if="chatMessages - averageStats.chatMessages !== 0">
                <fa :icon="chatMessages - averageStats.chatMessages > 0 ? 'caret-up' : 'caret-down'"/>
                <span>{{difference(averageStats.chatMessages, chatMessages)}}</span>
              </template>
            </small>
          </span>
          <h2>{{ translate('chat-messages') }}</h2>
        </div>

        <div class="col-6 col-sm-4 col-md-4 col-lg-1 stream-info">
          <span class="data" v-bind:title="currentViews">{{ shortenNumber(currentViews, b_shortenNumber) }}</span>
          <span class="stats">
            <small v-if="b_showAvgDiff && isStreamOnline && currentViews - averageStats.currentViews !== 0"
                   :class="{
                     'text-success': currentViews - averageStats.currentViews > 0,
                     'stats-up': currentViews - averageStats.currentViews > 0,
                     'text-danger': currentViews - averageStats.currentViews < 0,
                     'stats-down': currentViews - averageStats.currentViews < 0,
                   }">
              <template v-if="currentViews - averageStats.currentViews !== 0">
                <fa :icon="currentViews - averageStats.currentViews > 0 ? 'caret-up' : 'caret-down'"/>
                <span>{{difference(averageStats.currentViews, currentViews)}}</span>
              </template>
            </small>
          </span>
          <h2>{{ translate('views') }}</h2>
        </div>

        <div class="col-6 col-sm-4 col-md-4 col-lg-1 stream-info">
          <span class="data">{{ isStreamOnline ? currentHosts : 0 }}</span>
          <span class="stats">&nbsp;</span>
          <h2>{{ translate('hosts') }}</h2>
        </div>

        <div class="col-6 col-sm-4 col-md-4 col-lg-1 stream-info">
          <span class="data" v-bind:title="currentFollowers">{{ shortenNumber(currentFollowers, b_shortenNumber) }}</span>
          <span class="stats">
            <small v-if="b_showAvgDiff && isStreamOnline && currentFollowers - averageStats.currentFollowers !== 0"
                   :class="{
                     'text-success': currentFollowers - averageStats.currentFollowers > 0,
                     'stats-up': currentFollowers - averageStats.currentFollowers > 0,
                     'text-danger': currentFollowers - averageStats.currentFollowers < 0,
                     'stats-down': currentFollowers - averageStats.currentFollowers < 0,
                   }">
              <template v-if="currentFollowers - averageStats.currentFollowers !== 0">
                <fa :icon="currentFollowers - averageStats.currentFollowers > 0 ? 'caret-up' : 'caret-down'"/>
                <span>{{difference(averageStats.currentFollowers, currentFollowers)}}</span>
              </template>
            </small>
          </span>
          <h2>{{ translate('followers') }}</h2>
        </div>

        <div class="col-6 col-sm-4 col-md-4 col-lg-1 stream-info">
          <template v-if="broadcasterType !== ''">
            <span class="data">{{ currentSubscribers }}</span>
            <span class="stats">
              <small v-if="b_showAvgDiff && isStreamOnline && currentSubscribers - averageStats.currentSubscribers !== 0"
                    :class="{
                      'text-success': currentSubscribers - averageStats.currentSubscribers > 0,
                      'stats-up': currentSubscribers - averageStats.currentSubscribers > 0,
                      'text-danger': currentSubscribers - averageStats.currentSubscribers < 0,
                      'stats-down': currentSubscribers - averageStats.currentSubscribers < 0,
                    }">
                <template v-if="currentSubscribers - averageStats.currentSubscribers !== 0">
                  <fa :icon="currentSubscribers - averageStats.currentSubscribers > 0 ? 'caret-up' : 'caret-down'"/>
                  <span>{{difference(averageStats.currentSubscribers, currentSubscribers)}}</span>
                </template>
              </small>
            </span>
          </template>
          <template v-else>
            <span class="data text-muted" style="font-size:0.7rem;">{{ translate('not-affiliate-or-partner') }}</span>
          </template>
          <h2>{{ translate('subscribers') }}</h2>
        </div>

        <div class="col-6 col-sm-4 col-md-4 col-lg-1 stream-info">
          <template v-if="broadcasterType !== ''">
            <span class="data" v-bind:title="currentBits">{{ isStreamOnline ? shortenNumber(currentBits, b_shortenNumber) : 0 }}</span>
            <span class="stats">
              <small v-if="b_showAvgDiff && isStreamOnline && currentBits - averageStats.currentBits !== 0"
                    :class="{
                      'text-success': currentBits - averageStats.currentBits > 0,
                      'stats-up': currentBits - averageStats.currentBits > 0,
                      'text-danger': currentBits - averageStats.currentBits < 0,
                      'stats-down': currentBits - averageStats.currentBits < 0,
                    }">
                <template v-if="currentBits - averageStats.currentBits !== 0">
                  <fa :icon="currentBits - averageStats.currentBits > 0 ? 'caret-up' : 'caret-down'"/>
                  <span>{{difference(averageStats.currentBits, currentBits)}}</span>
                </template>
              </small>
            </span>
          </template>
          <template v-else>
            <span class="data text-muted" style="font-size:0.7rem;">{{ translate('not-affiliate-or-partner') }}</span>
          </template>
          <h2>{{ translate('bits') }}</h2>
        </div>

        <div class="col-6 col-sm-4 col-md-4 col-lg-1 stream-info">
          <span class="data">{{ isStreamOnline ? Number(currentTips).toFixed(2) : '0.00' }}</span><span class="data ml-0 pl-0">{{ currency }}</span>
          <span class="stats">
            <small v-if="b_showAvgDiff && isStreamOnline && currentTips - averageStats.currentTips !== 0"
                  :class="{
                    'text-success': currentTips - averageStats.currentTips > 0,
                    'stats-up': currentTips - averageStats.currentTips > 0,
                    'text-danger': currentTips - averageStats.currentTips < 0,
                    'stats-down': currentTips - averageStats.currentTips < 0,
                  }">
              <template v-if="currentTips - averageStats.currentTips !== 0">
                <fa :icon="currentTips - averageStats.currentTips > 0 ? 'caret-up' : 'caret-down'"/>
                <span>{{difference(averageStats.currentTips, currentTips, false, currency)}}</span>
              </template>
            </small>
          </span>
          <h2>{{ translate('tips') }}</h2>
        </div>

        <div class="col-6 col-sm-4 col-md-4 col-lg-1 stream-info">
          <span class="data">{{ isStreamOnline ? Number(currentWatched / 1000 / 60 / 60).toFixed(1) : '0.0' }}</span><span class="data ml-0 pl-0">h</span>
          <span class="stats">
            <small v-if="b_showAvgDiff && isStreamOnline && currentWatched - averageStats.currentWatched !== 0"
                  :class="{
                    'text-success': currentWatched - averageStats.currentWatched > 0,
                    'stats-up': currentWatched - averageStats.currentWatched > 0,
                    'text-danger': currentWatched - averageStats.currentWatched < 0,
                    'stats-down': currentWatched - averageStats.currentWatched < 0,
                  }">
              <template v-if="currentWatched - averageStats.currentWatched !== 0">
                <fa :icon="currentWatched - averageStats.currentWatched > 0 ? 'caret-up' : 'caret-down'"/>
                <span>{{difference(averageStats.currentWatched / 1000 / 60 / 60, currentWatched / 1000 / 60 / 60, false, 'h', 1)}}</span>
              </template>
            </small>
          </span>
          <h2>{{ translate('watched-time') }}</h2>
        </div>
      </div>

      <div class="row">
        <div class="col-12 col-sm-12 col-md-4 col-lg-4 stream-info" @click="showGameAndTitleDlg">
          <span class="data" v-if="game" :title="game">{{ game }}</span>
          <span  class="data" v-else>{{ translate('not-available') }}</span>
          <h2>
            <span>{{ translate('game') }}</span>
            <small>{{ translate('click-to-change') }}</small>
          </h2>
        </div>

        <div class="col-12 col-sm-12 col-md-4 col-lg-4 stream-info" @click="showGameAndTitleDlg">
          <span class="data" v-if="title" :title="rawStatus" v-html="title"></span>
          <span class="data" v-else>{{ translate('not-available') }}</span>
          <span class="data">
            <small v-for="tag of filterTags(true)" :key="tag.name"
              :class="{ 'text-muted': tag.is_auto }" :title="tag.is_auto ? 'Automatically added tag' : 'Manual tag'">
              {{ tag.name }}
            </small>
            <span v-for="tag of filterTags(false)" :key="tag.name"
              :class="{ 'text-muted': tag.is_auto }" :title="tag.is_auto ? 'Automatically added tag' : 'Manual tag'">
              {{ tag.name }}
            </span>
          </span>
          <h2>
            <span>{{ translate('title') }}</span>
            <small>{{ translate('click-to-change') }}</small>
          </h2>
        </div>

        <div class="col-12 col-sm-12 col-md-4 col-lg-4 stream-info">
          <span class="data">
            {{ currentSong }}
          </span>
          <h2>
            <span>{{ translate('currentsong') }}</span>
          </h2>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import { isNil } from 'lodash-es'

  import { EventBus } from 'src/panel/helpers/event-bus';
  import { getSocket } from 'src/panel/helpers/socket';

  import type { UIError } from 'src/bot/panel';

  import { library } from '@fortawesome/fontawesome-svg-core';
  import {
    faCaretDown, faCaretUp
  } from '@fortawesome/free-solid-svg-icons';
  library.add(faCaretDown, faCaretUp);

  let interval = 0;
  let UIErrorInterval = 0;

  export default Vue.extend({
    data: function () {
      const object: {
        errors: UIError[],
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
        currentSong: null | string,
        currentWatched: number,
        currentSubscribers: number,
        currentFollowers: number,
        currentTips: number,
        currency: string,
        broadcasterType: string,
        tags: any[],
        isLoaded: boolean,

        version: string;
        update: {
          version: null | string
        },

        title: string | null,
        game: string | null,
        rawStatus: string,
        cachedTitle: string,

        top: string,
        widthOfMenuInterval: number,
        socket: SocketIOClient.Socket
      } = {
        errors: [],
        highlightsSocket: getSocket('/systems/highlights'),
        averageStats: {},

        hideStats: localStorage.getItem('hideStats') === 'true',
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
        currentSong: null,
        currency: 'n/a',
        broadcasterType: '',
        tags: [],

        version: '',
        update: {
          version: null,
        },

        title: null,
        game: null,
        rawStatus: '',
        cachedTitle: '',

        isLoaded: false,

        top: '50',
        widthOfMenuInterval: 0,

        socket: getSocket('/'),
      }
      return object
    },

    destroyed() {
      clearInterval(this.widthOfMenuInterval)
      clearInterval(interval)
      clearInterval(UIErrorInterval)
    },

    mounted() {
      this.b_percentage = this.configuration.core.ui.percentage
      this.b_showAvgDiff = this.configuration.core.ui.showdiff
      this.b_shortenNumber = this.configuration.core.ui.shortennumbers
      this.b_sticky = this.configuration.core.ui.stickystats


      this.widthOfMenuInterval = window.setInterval(() => {
        this.widthOfMenuUpdate()
      }, 100)

      this.socket.emit('version', async (version: string) => {
        this.version =  version;

        const { response } = await new Promise(resolve => {
          const request = new XMLHttpRequest();
          request.open('GET', 'https://api.github.com/repos/sogehige/sogebot/releases/latest', true);

          request.onload = function() {
            if (!(this.status >= 200 && this.status < 400)) {
              console.error('Error getting version from git', this.status, this.response)
            }
            resolve({ response: JSON.parse(this.response)})
          }
          request.onerror = function() {
            console.error('Connection error to github')
            resolve( { response: {} });
          };

          request.send();
        })
        let botVersion = version.replace('-SNAPSHOT', '').split('.').map(o => Number(o))
        let gitVersion = (response.tag_name as string).split('.').map(o => Number(o))
        console.debug({botVersion, gitVersion});

        let isNewer = false
        for (let index = 0; index < botVersion.length; index++) {
          if (botVersion[index] < gitVersion[index]) {
            isNewer = true
            break
          } else if (botVersion[index] === gitVersion[index]) continue
          else {
            isNewer = false
            break
          }
        }

        if (isNewer) {
          this.update.version = gitVersion.join('.');
        }
      })

      UIErrorInterval = window.setInterval(() => {
        this.socket.emit('panel::errors', (err: string | null, data: { name: string; message: string }[]) => {
          if (err) {
            return console.error(err);
          }
          for (const error of data) {
            console.error(`UIError: ${error.name} ¦ ${error.message}`);
          }
          this.errors = data;
        });
      }, 5000);

      this.socket.emit('getLatestStats', (err: string | null, data: any) => {
        console.groupCollapsed('navbar::getLatestStats')
        if (err) {
          return console.error(err);
        }
        console.log(data);
        console.groupEnd();
        this.averageStats = data
      });

      interval = window.setInterval(() => {
        this.timestamp = Date.now()
        this.socket.emit('panel.sendStreamData', async (err: string | null, data: { [x: string]: any, rawStatus: string, status: string, game: string }) => {
          console.groupCollapsed('navbar::panel.sendStreamData')
          if (err) {
            return console.error(err);
          }
          console.log(data)
          console.groupEnd();
          for (let [key, value] of Object.entries(data)) {
            // @ts-ignore
            this[key] = value // populate data
          }
          this.isLoaded = true

          this.title = await this.generateTitle(data.status, data.rawStatus);
          this.rawStatus = data.rawStatus;
          this.game = data.game;
        });
      }, 1000);
    },
    computed: {
      isStreamOnline() {
        return (this as any).uptime !== '00:00:00';
      }
    },
    methods: {
      widthOfMenuUpdate() {
        this.top = (<HTMLElement>this.$refs.quickwindow).getBoundingClientRect().right < 900 ? '80' : '50';
      },
      showGameAndTitleDlg: function () {
        EventBus.$emit('show-game_and_title_dlg');
      },
      loadCustomVariableValue: async function (variable: string) {
        return new Promise((resolve, reject) => {
          this.socket.emit('custom.variable.value', variable, (err: string | null, value: string) => {
            resolve(value)
          })
        })
      },
      generateTitle: async function (current: string, raw: string) {
        if (raw.length === 0) return current

        let variables = raw.match(/(\$_[a-zA-Z0-9_]+)/g)
        if (this.cachedTitle === current && isNil(variables)) {
          return this.cachedTitle
        }

        if (!isNil(variables)) {
          for (let variable of variables) {
            let value = await this.loadCustomVariableValue(variable)
            raw = raw.replace(variable, `<strong style="border-bottom: 1px dotted gray" data-toggle="tooltip" data-placement="bottom" title="${variable}">${value}</strong>`)
          }
        }
        this.cachedTitle = raw
        return raw
      },
      shortenNumber: function (number: number, shortify: boolean) {
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
      filterTags (is_auto: boolean) {
        return this.tags.filter(o => !!o.is_auto === is_auto).map((o) => {
          const key = Object.keys(o.localization_names).find(key => key.includes(this.configuration.lang))
          return {
            name: o.localization_names[key || 'en-us'], is_auto: !!o.is_auto
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
      difference: function (number: number, current: number, shorten: boolean, postfix: string, toFixed: number) {
        postfix = postfix || ''
        shorten = typeof shorten === 'undefined' ? true : shorten
        number = number || 0
        if (Number.isNaN(Number(current)) || !this.isStreamOnline || !this.b_showAvgDiff) return '' // return nothing if current is not number (hidden, etc)
        else if (number === 0) return ''
        else {
          let f_difference: number | string = Math.abs(this.b_percentage ? (Math.round((current - number) / number * 1000) / 10) : current - number)
          if (this.b_percentage) {
            if (!isFinite(f_difference)) {
              return '';
            }
            f_difference = Number(f_difference).toFixed(1)
            f_difference = `${f_difference}%`
          } else {
            if (shorten) {
              f_difference = this.shortenNumber(f_difference, this.b_shortenNumber)
            } else {
              f_difference = Number(f_difference).toFixed(1)
            }
            if (toFixed) {
              f_difference = Number(f_difference).toFixed(toFixed)
            }
            f_difference = f_difference + postfix
          }
         return f_difference;
        }
      },
      toggleViewerShow: function () {
        this.hideStats = !this.hideStats
        localStorage.setItem('hideStats', String(this.hideStats))
      }
    },
  })
</script>

<style scoped>
@media (max-width : 576px) {
  .stream-info:first-child::before {
    border-left: 0;
  }
  .stream-info:nth-child(2n-1)::before {
    border-left: 0;
  }
}

@media (min-width : 576px) and (max-width : 992px) {
  .stream-info:first-child::before {
    border-left: 0;
  }
  .stream-info:nth-child(3n+1)::before {
    border-left: 0;
  }
}

@media (min-width : 992px){
  .stream-info:nth-child(13)::before {
    border-left: 0;
  }
}
</style>