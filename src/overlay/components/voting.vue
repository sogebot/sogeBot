<template>
<div>
      <pre class="debug" :class="[!urlParam('debug') ? 'hide' : '']">
currentVote: {{ currentVote }}
votes: {{ votes }}
      </pre>
  <transition name="fade">
    <div id="box" v-if="typeof currentVote.title !== 'undefined'" v-show="currentTime - lastUpdatedAt < 7000">
      <strong class="title">{{currentVote.title}}</strong>
      <div class="helper" v-if="currentVote.type === 'normal'">Type <kbd>!vote 1</kbd>, <kbd>!vote 2</kbd>, ... in chat to vote</div>
      <div class="helper" v-else-if="currentVote.type === 'tips'">Add <kbd>#vote1</kbd>, <kbd>#vote2</kbd>, ... to your <strong>tips</strong> message</div>
      <div class="helper" v-else>Add <kbd>#vote1</kbd>, <kbd>#vote2</kbd>, ... to your <strong>bits</strong> message</div>
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
        <div style="width: 100%">Total votes
          <strong v-if="currentVote.type !== 'tips'">{{ totalVotes }}</strong>
          <strong v-else>{{ Number(totalVotes).toFixed(1) }}</strong>
        </div>
        <div style="width: 100%">Active <strong>{{ activeTime | duration('humanize') }}</strong></div>
      </div>
    </div>
  </transition>
</div>
</template>

<script>
import Vue from 'vue'
import VueMoment from 'vue-moment'
import moment from 'moment-timezone'

Vue.use(VueMoment, {
    moment,
})

export default {
  props: ['token'],
  data: function () {
    return {
      socket: io('/overlays/voting', {query: "token="+token}),
      currentVote: {},
      votes: [],
      lastUpdatedAt: 0,
      currentTime: 0,
      cachedVotes: [],
    }
  },
  created: function () {
    this.refresh()
    setInterval(() => this.currentTime = Date.now(), 100)
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
      this.socket.emit('data', (cb, votes) => {
        // force show if new vote
        if (typeof this.currentVote.title === 'undefined') this.lastUpdatedAt = Date.now()
        this.votes = votes
        this.currentVote = cb
        setTimeout(() => this.refresh(), 5000)
      })
    }
  }
}
</script>

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
    background-color: #f0f1f4;
    color: rgb(32, 32, 32);
    box-shadow: 0px 0px 2rem black;
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
    background-color: rgb(138, 138, 138);
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
</style>