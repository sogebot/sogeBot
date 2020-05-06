<template>
<div style="height: 100%; display: flex;">
  <div v-if="urlParam('debug')">
    <json-viewer :value="{currentVote, votes, settings, shouldShow: settings.display.hideAfterInactivity && inactivityTime < settings.display.inactivityTime, inactivityTime }" boxed copyable :expand-depth="10"></json-viewer>
  </div>
  <transition name="fade">
    <div id="box"
      v-if="currentVote !== null"
      v-show="!settings.display.hideAfterInactivity || (settings.display.hideAfterInactivity && inactivityTime < settings.display.inactivityTime)"
      :class="[getTheme(settings.display.theme)]"
      style="display: inline-block; width: 100%;"
      :style="{ 'align-self': settings.display.align === 'top' ? 'flex-start' : 'flex-end' }">
      <strong class="title">{{currentVote.title}}</strong>
      <div class="helper" v-if="currentVote.type === 'normal'">{{ translate('systems.polls.overlay.type') }} <kbd>{{ voteCommand }} 1</kbd>, <kbd>{{ voteCommand }} 2</kbd>, {{ translate('systems.polls.overlay.inChatToVote') }}</div>
      <div class="helper" v-else-if="currentVote.type === 'tips'">{{ translate('systems.polls.overlay.add') }} <kbd>#vote1</kbd>, <kbd>#vote2</kbd>, <template v-html="translate('systems.polls.overlay.toYourMessage').replace('$type', translate('systems.polls.overlay.tips'))"></template></div>
      <div class="helper" v-else>{{ translate('systems.polls.overlay.add') }} <kbd>#vote1</kbd>, <kbd>#vote2</kbd>, <template v-html="translate('systems.polls.overlay.toYourMessage').replace('$type', translate('systems.polls.overlay.bits'))"></template></div>
      <div class="options"
        v-for="(option, index) in currentVote.options"
        :key="option"
        :class="[index === 0 ? 'first' : '', index === currentVote.options.length - 1 ? 'last': '']">
        <div class="numbers">{{index+1}}</div>
        <div style="width:100%">
          <div>{{option}}</div>
          <div class="background-bar"></div>
          <div class="bar"
            v-bind:style="{
            'width': getPercentage(index) === 0 ? '5px' : getPercentage(index) + '%'
            }"
          ></div>
        </div>
        <div class="percentage">{{getPercentage(index, 1)}}%</div>
      </div>
      <div id="footer">
        <div style="width: 100%">{{translate('systems.polls.totalVotes')}}
          <strong v-if="currentVote.type !== 'tips'">{{ totalVotes }}</strong>
          <strong v-else>{{ Number(totalVotes).toFixed(1) }}</strong>
        </div>
        <div style="width: 100%">{{translate('systems.polls.activeFor')}} <strong>{{ activeTime | duration('humanize') }}</strong></div>
      </div>
    </div>
  </transition>
</div>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import moment from 'moment'
import VueMoment from 'vue-moment'
import momentTimezone from 'moment-timezone'
import { getSocket } from 'src/panel/helpers/socket';
import JsonViewer from 'vue-json-viewer'

require('moment/locale/cs')
require('moment/locale/ru')

Vue.use(VueMoment, {
    moment, momentTimezone
})

@Component({
  components: {
    JsonViewer,
  },
})
export default class PollsOverlay extends Vue {
  socket = getSocket('/overlays/polls', true);
  currentVote: any = null;
  votes: any[] = [];
  lastUpdatedAt = 0;
  currentTime = 0;
  cachedVotes: any[] = [];
  voteCommand = '!vote';
  settings = {
    display: 'light',
    hideAfterInactivity: true,
    inativityTime: 5000,
    align: 'top'
  };
  interval: any[] = [];

  beforeDestroy() {
    for(const interval of this.interval) {
      clearInterval(interval);
    }
  }

  mounted () {
    this.$moment.locale(this.configuration.lang)
  }

  created () {
    this.refresh()
    this.interval.push(setInterval(() => this.currentTime = Date.now(), 100));
    this.socket.emit('getVoteCommand', (cmd) => this.voteCommand = cmd)
  }

  get inactivityTime() {
    return this.currentTime - this.lastUpdatedAt;
  }

  get activeTime () {
    return this.currentTime - (new Date(this.currentVote.openedAt)).getTime()
  }
  get totalVotes () {
    let votes = 0
    for (let i = 0, length = this.votes.length; i < length; i++) {
      votes += this.votes[i].votes
    }
    return votes
  }

  @Watch('votes')
  votesWatcher (val, old) {
    if (this.currentVote && this.currentVote.options !== 'undefined') {
      for (let idx of Object.keys(this.currentVote.options)) {
        let count = 0
        let cachedCount = 0
        for (let v of val.filter(o => String(o.option) === idx)) count += v.votes
        for (let v of this.cachedVotes.filter(o => String(o.option) === idx)) cachedCount += v.votes
        if (cachedCount !== count) this.lastUpdatedAt = Date.now() // there is some change
      }
      this.cachedVotes = val // update cached votes
    } else {
      this.cachedVotes = []
    }
  }

  getTheme (theme) {
    return theme.replace(/ /g, '_').toLowerCase().replace(/\W/g, '')
  }

  getPercentage (index, toFixed) {
    let votes = 0
    for (let i = 0, length = this.votes.length; i < length; i++) {
      if (this.votes[i].option === index) votes += this.votes[i].votes
    }
    return Number((100 / this.totalVotes) * votes || 0).toFixed(toFixed || 0);
  }

  refresh () {
    this.socket.emit('data', (cb, votes, settings) => {
      // force show if new vote
      if (this.currentVote === null) {
        this.lastUpdatedAt = Date.now()
      }
      this.votes = votes
      this.currentVote = cb
      this.settings = settings
      setTimeout(() => this.refresh(), 5000)
    })
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