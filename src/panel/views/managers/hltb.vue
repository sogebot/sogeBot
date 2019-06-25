<template>
  <div class="container-fluid" ref="window">
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><i class="fas fa-angle-right"></i></small>
          {{ translate('menu.hltb') }}
        </span>
      </div>
    </div>

    <panel cards></panel>

    <template v-for="(chunkGames, index) of _.chunk(games, itemsPerLine)">
      <div class="card-deck" v-bind:key="index">
        <template v-for="game of chunkGames">
          <div class="card mb-3 p-0 border" v-bind:key="String(game.game)" :class="[game.isOpened ? 'border-info' : '']">
            <div class="col p-0 text-center" style="{ max-height: 250px; background-color: black; }">
              <img :src="game.imageUrl" v-bind:key="String(game.game)"/>
              <h5 class="centered" style="text-transform: inherit;">{{ game.game }}</h5>
            </div>
            <div class="card-body col">
              <dl class="row">
                <dt class="col-6">Main</dt>
                <dd class="col-6">
                  <fa icon="spinner" spin v-if="!game.isFinishedMain" class="text-info"/>
                  <fa icon="check" class="text-success" v-else/>
                  {{ Number(game.timeToBeatMain / 1000 / 60 / 60).toFixed(1)}}h / {{ game.gameplayMain }}h
                  <span class="percent">60<small>%</small></span>
                </dd>
                <dt class="col-6">Completionist</dt>
                <dd class="col-6">
                  <fa icon="spinner" spin v-if="!game.isFinishedMain" class="text-info"/>
                  <fa icon="check" class="text-success" v-else/>
                  {{ Number(game.timeToBeatCompletionist / 1000 / 60 / 60).toFixed(1)}}h / {{ game.gameplayCompletionist }}h
                  <span class="percent">60<small>%</small></span>
                </dd>
              </dl>
            </div>
            <div class="card-footer">
              <button type="button" class="btn btn-block btn-danger" @click="stop(String(game._id))">
                <fa icon='stop'></fa> {{ translate('systems.howlongtobeat.stopMain') }}
              </button>
            </div>
          </div>
        </template>

        <!-- add empty cards -->
        <template v-if="chunkGames.length !== itemsPerLine">
          <div class="card" style="visibility: hidden" v-for="i in itemsPerLine - (chunkGames.length % itemsPerLine)" v-bind:key="i"></div>
        </template>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'

  import moment from 'moment'
  import VueMoment from 'vue-moment'
  import momentTimezone from 'moment-timezone'

  require('moment/locale/cs')
  require('moment/locale/ru')

  import io from 'socket.io-client';

  Vue.use(VueMoment, {
      moment, momentTimezone
  })

  export default Vue.extend({
    components: {
      panel: () => import('../../components/panel.vue'),
    },
    data: function () {
      const object: {
        socket: any,
        itemsPerLine: number,
        games: import('../../../bot/systems/howlongtobeat').Game[],
      } = {
        socket: io('/systems/howlongtobeat', { query: "token=" + this.token }),
        games: [],
        itemsPerLine: 2,
      }
      return object
    },
    created() {
      this.socket.emit('find', {}, (err, data) => {
        if (err) return console.error(err)
        this.games = this._.orderBy(data, 'startedAt', 'desc')
      })
    }
  })
</script>

<style scoped>
.centered {
  position: absolute;
  left: 50%;
  top: 0%;
  transform: translate(-50%, 0%);
  padding: 0.5rem;
  margin: 0.2rem;
  background-color: rgba(0,0,0,0.5);
}

.percent {
  font-size: 2rem;
}
</style>