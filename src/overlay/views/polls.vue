<template>
  <div style="height: 100%; display: flex;">
    <div v-if="urlParam('debug')">
      <json-viewer
        :value="{currentVote, votes, settings, shouldShow: settings.display.hideAfterInactivity && inactivityTime < settings.display.inactivityTime, inactivityTime }"
        boxed
        copyable
        :expand-depth="10"
      />
    </div>
    <transition name="fade">
      <div
        v-if="currentVote !== null"
        v-show="!settings.display.hideAfterInactivity || (settings.display.hideAfterInactivity && inactivityTime < settings.display.inactivityTime)"
        id="box"
        :class="[getTheme(settings.display.theme)]"
        style="display: inline-block; width: 100%;"
        :style="{ 'align-self': settings.display.align === 'top' ? 'flex-start' : 'flex-end' }"
      >
        <strong class="title">{{ currentVote.title }}</strong>
        <div
          v-if="currentVote.type === 'normal'"
          class="helper"
        >
          {{ translate('systems.polls.overlay.type') }} <kbd>{{ voteCommand }} 1</kbd>, <kbd>{{ voteCommand }} 2</kbd>, {{ translate('systems.polls.overlay.inChatToVote') }}
        </div>
        <div
          v-else-if="currentVote.type === 'numbers'"
          class="helper"
        >
          {{ translate('systems.polls.overlay.type') }} <kbd>1</kbd>, <kbd>2</kbd>,  {{ translate('systems.polls.overlay.inChatToVote') }}
        </div>
        <div
          v-else-if="currentVote.type === 'tips'"
          class="helper"
        >
          {{ translate('systems.polls.overlay.add') }} <kbd>#vote1</kbd>, <kbd>#vote2</kbd>, <span v-html="translate('systems.polls.overlay.toYourMessage').replace('$type', translate('systems.polls.overlay.tips'))" />
        </div>
        <div
          v-else
          class="helper"
        >
          {{ translate('systems.polls.overlay.add') }} <kbd>#vote1</kbd>, <kbd>#vote2</kbd>, <span v-html="translate('systems.polls.overlay.toYourMessage').replace('$type', translate('systems.polls.overlay.bits'))" />
        </div>
        <div
          v-for="(option, index) in currentVote.options"
          :key="option"
          class="options"
          :class="[index === 0 ? 'first' : '', index === currentVote.options.length - 1 ? 'last': '']"
        >
          <div class="numbers">
            {{ index+1 }}
          </div>
          <div style="width:100%">
            <div>{{ option }}</div>
            <div class="background-bar" />
            <div
              class="bar"
              :style="{
                'width': getPercentage(index) === 0 ? '5px' : getPercentage(index) + '%'
              }"
            />
          </div>
          <div class="percentage">
            {{ getPercentage(index, 1) }}%
          </div>
        </div>
        <div id="footer">
          <div style="width: 100%">
            {{ translate('systems.polls.totalVotes') }}
            <strong v-if="currentVote.type !== 'tips'">{{ totalVotes }}</strong>
            <strong v-else>{{ Number(totalVotes).toFixed(1) }}</strong>
          </div>
          <div style="width: 100%">
            {{ translate('systems.polls.activeFor') }} <strong>{{ dayjs().from(dayjs(activeTime), true) }}</strong>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import JsonViewer from 'vue-json-viewer';
import {
  Component, Vue, Watch,
} from 'vue-property-decorator';

import { dayjs } from 'src/bot/helpers/dayjs';

import { PollInterface } from '../../bot/database/entity/poll';

@Component({ components: { JsonViewer } })
export default class PollsOverlay extends Vue {
  dayjs = dayjs;
  socket = getSocket('/overlays/polls', true);
  currentVote: any = null;
  votes: any[] = [];
  lastUpdatedAt = 0;
  currentTime = 0;
  cachedVotes: any[] = [];
  voteCommand = '!vote';
  settings = {
    display:             'light',
    hideAfterInactivity: true,
    inativityTime:       5000,
    align:               'top',
  };
  interval: any[] = [];

  beforeDestroy() {
    for(const interval of this.interval) {
      clearInterval(interval);
    }
  }

  created () {
    this.refresh();
    this.interval.push(setInterval(() => this.currentTime = Date.now(), 100));
    this.socket.emit('getVoteCommand', (cmd: string) => this.voteCommand = cmd);
  }

  get inactivityTime() {
    return this.currentTime - this.lastUpdatedAt;
  }

  get activeTime () {
    return new Date(this.currentVote.openedAt).getTime();
  }
  get totalVotes () {
    let votes = 0;
    for (let i = 0, length = this.votes.length; i < length; i++) {
      votes += this.votes[i].votes;
    }
    return votes;
  }

  @Watch('votes')
  votesWatcher (val: any[], old: any[]) {
    if (this.currentVote && this.currentVote.options !== 'undefined') {
      for (const idx of Object.keys(this.currentVote.options)) {
        let count = 0;
        let cachedCount = 0;
        for (const v of val.filter(o => String(o.option) === idx)) {
          count += v.votes;
        }
        for (const v of this.cachedVotes.filter(o => String(o.option) === idx)) {
          cachedCount += v.votes;
        }
        if (cachedCount !== count) {
          this.lastUpdatedAt = Date.now();
        } // there is some change
      }
      this.cachedVotes = val; // update cached votes
    } else {
      this.cachedVotes = [];
    }
  }

  getTheme (theme: string) {
    return theme.replace(/ /g, '_').toLowerCase().replace(/\W/g, '');
  }

  getPercentage (index: number, toFixed: number) {
    let votes = 0;
    for (let i = 0, length = this.votes.length; i < length; i++) {
      if (this.votes[i].option === index) {
        votes += this.votes[i].votes;
      }
    }
    return Number((100 / this.totalVotes) * votes || 0).toFixed(toFixed || 0);
  }

  refresh () {
    this.socket.emit('data', (cb: PollInterface, votes: any[], settings: { display: string, hideAfterInactivity: boolean, inativityTime: number, align: string }) => {
      // force show if new vote
      if (this.currentVote === null) {
        this.lastUpdatedAt = Date.now();
      }
      this.votes = votes;
      this.currentVote = cb;
      this.settings = settings;
      setTimeout(() => this.refresh(), 5000);
    });
  }
}
</script>

<style>
  #overlays {
    height: 100%;
  }
</style>

<style scoped>
  @import url('https://fonts.googleapis.com/css?family=Barlow');
  @import url('https://fonts.googleapis.com/css?family=Barlow+Condensed');

  .hide {
    display: none;
  }

  #box {
    font-family: 'Barlow';
    padding: 0.5rem 1rem;
    margin: 1.5rem;

  }

  .title {
    font-size: 1.2rem;
  }

  .helper {
    text-align: center;
    padding-top: 0.5rem;
  }

  .options, #footer {
    width: 100%;
    display: flex;
    padding: 0.5rem 0;
  }

  .options.first {
    padding-top: 1rem;
  }

  .options.last {
    padding-bottom: 1rem;
  }

  #footer {
    text-align: center;
  }

  .numbers {
    padding: 0 1rem 0 0;
    width: 1%;
  }

  .percentage {
    padding: 0;
    width: 80px;
    text-align: right;
  }

  .background-bar, .bar {
    position: relative;
    top: 0.5rem;
    height: 0.5rem;
    width: 100%;
  }

  .bar {
    position: relative;
    top: 0rem;
    background-color: rgb(207, 207, 207);
  }

  .fade-enter-active, .fade-leave-active {
    transition: opacity 1s;
  }
  .fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
    opacity: 0;
  }

  /* LIGHT THEME */
  #box.light {
    background-color: #f0f1f4;
    color: rgb(32, 32, 32);
    box-shadow: 0px 0px 2rem black;
  }

  #box.light .background-bar {
    background-color: rgb(207, 207, 207);
  }

  #box.light .bar {
    background-color: rgb(138, 138, 138);
  }

  /* DARK THEME */
  #box.dark {
    background-color: rgb(32, 32, 32);
    color: #f0f1f4;
    box-shadow: 0px 0px 2rem black;
  }

  #box.dark .background-bar {
    background-color: rgb(138, 138, 138);
  }

  #box.dark .bar {
    background-color: rgb(207, 207, 207);
  }

  /* SOGE'S GREEN THEME */
  #box.soges_green {
    background-color: rgba(0, 0, 0, 0.8);
    color: #f0f1f4;
    border-top: 5px solid #acd301;
    border-bottom: 5px solid #acd301;
  }

  #box.soges_green .bar {
    background-color: #acd301
  }

  #box.soges_green .numbers {
    color: #acd301;
    font-size: 2rem;
    font-weight: bold;
    padding-right: 2rem;
  }

  #box.soges_green #footer strong {
    color: #acd301;
  }
</style>