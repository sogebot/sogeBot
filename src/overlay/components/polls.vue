<template>
<div style="height: 100%; display: flex;">
      <pre class="debug" :class="[!urlParam('debug') ? 'hide' : '']">
currentVote: {{ currentVote }}
votes: {{ votes }}
settings: {{ settings }}
shouldShow: {{settings.display.hideAfterInactivity && currentTime - lastUpdatedAt < settings.display.inactivityTime}}
inactivityTime: {{currentTime - lastUpdatedAt}}
      </pre>
  <transition name="fade">
    <div id="box"
      v-if="typeof currentVote.title !== 'undefined'"
      v-show="!settings.display.hideAfterInactivity || (settings.display.hideAfterInactivity && currentTime - lastUpdatedAt < settings.display.inactivityTime)"
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

<script>
import Vue from 'vue'
  import moment from 'moment'
  import VueMoment from 'vue-moment'
  import momentTimezone from 'moment-timezone'
import io from 'socket.io-client';

require('moment/locale/cs')
require('moment/locale/ru')

Vue.use(VueMoment, {
    moment, momentTimezone
})

export default {
  props: ['token'],
  data: function () {
    return {
      socket: io('/overlays/polls', {query: "token="+token}),
      currentVote: {},
      votes: [],
      lastUpdatedAt: 0,
      currentTime: 0,
      cachedVotes: [],
      voteCommand: '!vote',
      settings: {
        display: 'light',
        hideAfterInactivity: true,
        inativityTime: 5000,
        align: 'top'
      },
    }
  },
  mounted: function () {
    this.$moment.locale(this.configuration.lang)
  },
  created: function () {
    this.refresh()
    setInterval(() => this.currentTime = Date.now(), 100)
    this.socket.emit('getVoteCommand', (cmd) => this.voteCommand = cmd)
  },
  computed: {
    activeTime: function () {
      return this.currentTime - (new Date(this.currentVote.openedAt)).getTime()
    },
    totalVotes: function () {
      let votes = 0
      for (let i = 0, length = this.votes.length; i < length; i++) {
        votes += this.votes[i].votes
      }
      return votes
    }
  },
  watch: {
    votes: function (val, old) {
      if (typeof this.currentVote.options !== 'undefined') {
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
  },
  methods: {
    getTheme: function (theme) {
      return theme.replace(/ /g, '_').toLowerCase().replace(/\W/g, '')
    },
    urlParam: function (name) {
      var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
      if (results == null) {
        return null
      } else {
        return decodeURI(results[1]) || 0;
      }
    },
    getPercentage: function (index, toFixed) {
      let votes = 0
      for (let i = 0, length = this.votes.length; i < length; i++) {
        if (this.votes[i].option === index) votes += this.votes[i].votes
      }
      return Number((100 / this.totalVotes) * votes || 0).toFixed(toFixed || 0);
    },
    refresh: function () {
      this.socket.emit('data', (cb, votes, settings) => {
        // force show if new vote
        if (typeof this.currentVote.title === 'undefined') this.lastUpdatedAt = Date.now()
        this.votes = votes
        this.currentVote = cb
        this.settings = settings
        setTimeout(() => this.refresh(), 5000)
      })
    }
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

  .debug {
    z-index: 9999;
    background-color: rgba(0, 0, 0, 0.5);
    position: absolute;
    color: white;
    padding: 1rem;
  }

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