<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-12">
        <span class="title text-default"> {{ translate('menu.voting') }}</span>
      </div>
    </div>

    <panel ref="panel" class="pt-3 pb-3 mt-3 mb-3 m-0 border-top border-bottom row"
      :options="{ hideNewButton: true, hideTableButton: true }"></panel>

    <div class="card col-4 mb-3 p-0" v-for="vote of votes" v-bind:key="String(vote._id)">
      <div class="card-body">
        <h5 class="card-title">Je lepsi Star Citizen nebo Elite:Dangerous?</h5>
        <h6 class="card-subtitle mb-2 text-muted">
          <template v-if="vote.type === 'normal'">
            <font-awesome-icon icon='terminal'></font-awesome-icon> Voting by !vote
          </template>
          <template v-if="vote.type === 'tips'">
            <font-awesome-icon icon='coins'></font-awesome-icon> Voting by tips
          </template>
          <template v-if="vote.type === 'bits'">
            <font-awesome-icon icon='gem'></font-awesome-icon> Voting by bits
          </template>
        </h6>

        <div class="options"
          v-for="(option, index) in vote.options"
          :key="option"
          :class="[index === 0 ? 'first' : '', index === vote.options.length - 1 ? 'last': '']">
          <div style="width:100%">
            <div>{{option}}</div>
            <div class="background-bar"></div>
            <div class="bar"
              v-bind:style="{
              'width': getPercentage(String(vote._id), index, 1) === 0 ? '5px' : getPercentage(String(vote._id), index, 1) + '%'
              }"
            ></div>
          </div>
          <div class="percentage">{{getPercentage(String(vote._id), index, 1)}}%</div>
        </div>
        <div id="footer">
          <div style="width: 100%">Total votes
            <strong v-if="vote.type !== 'tips'">{{ totalVotes(String(vote._id)) }}</strong>
            <strong v-else>{{ Number(totalVotes(String(vote._id))).toFixed(1) }}</strong>
          </div>
          <div style="width: 100%">Active <strong>{{ activeTime | duration('humanize') }}</strong></div>
        </div>
      </div>
      <div class="card-footer">
        <button type="button" class="btn btn-block btn-info">
          <font-awesome-icon icon='copy'></font-awesome-icon> Copy
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import Component from 'vue-class-component'

  import * as io from 'socket.io-client';

  import { library } from '@fortawesome/fontawesome-svg-core'
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
  import { faTrophy, faCopy, faGem, faCoins, faTerminal } from '@fortawesome/free-solid-svg-icons';

  library.add(faTrophy, faCopy, faGem, faCoins, faTerminal)

  export default Vue.extend({
    components: {
      panel: () => import('../../components/panel.vue'),
      'font-awesome-icon': FontAwesomeIcon
    },
    data: function () {
      const object: {
        socket: any,
        votes: Array<VotingType>,
        votings: Array<VoteType>

      } = {
        socket: io('/systems/voting', { query: "token=" + this.token }),
        votes: [],
        votings: []
      }
      return object
    },
    mounted: function () {
      this.socket.emit('find', {}, (err, data) => {
        if (err) return console.error(err)
        console.log(data)
        this.votes = data
      })
      this.socket.emit('find', { collection: 'votes' }, (err, data) => {
        if (err) return console.error(err)
        console.log(data)
        this.votings = data
      })
    },
    methods: {
      totalVotes: function (vid) {
        let totalVotes = 0
        const filtered = this.votings.filter(o => o.vid === vid)
        for (let i = 0, length = filtered.length; i < length; i++) {
          totalVotes += filtered[i].votes
        }
        return totalVotes
      },
      getPercentage: function (vid, index, toFixed) {
        let votes = 0
        const filtered = this.votings.filter(o => o.vid === vid)
        for (let i = 0, length = filtered.length; i < length; i++) {
          if (filtered[i].option === index) votes += filtered[i].votes
        }
        return Number((100 / this.totalVotes(vid)) * votes || 0).toFixed(toFixed || 0);
      },
    }
  })
</script>

<style scoped>
  .hide {
    display: none;
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
  }
</style>