<template>
  <div class="container-fluid" ref="window">
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><i class="fas fa-angle-right"></i></small>
          {{ translate('menu.howlongtobeat') }}
        </span>
      </div>
    </div>

    <panel cards></panel>

    <template v-for="(chunkGames, index) of _.chunk(games, itemsPerLine)">
      <div class="card-deck" v-bind:key="index">
        <template v-for="game of chunkGames">
          <div class="card mb-3 p-0 border" v-bind:key="String(game.game)">
            <div class="col p-0 text-center" style="{ max-height: 250px; background-color: black; }">
              <img class="max" :src="game.imageUrl" v-bind:key="String(game.game)"/>
              <h5 class="centered" style="text-transform: inherit;">{{ game.game }}</h5>
              <div class="btn-group w-100" role="group" aria-label="Basic example">
                <button @click="game.isFinishedMain = !game.isFinishedMain; update('isFinishedMain', game.isFinishedMain, game.game);" class="btn btn-sm" :class="{ 'btn-success': game.isFinishedMain, 'btn-danger': !game.isFinishedMain }">
                  <fa icon="check" fixed-width v-if="game.isFinishedMain"/>
                  <fa icon="ban" fixed-width v-else/>
                  Main
                  <small v-if="game.isFinishedMain">(done)</small>
                </button>

                <button @click="game.isFinishedCompletionist = !game.isFinishedCompletionist; update('isFinishedCompletionist', game.isFinishedCompletionist, game.game);"  class="btn btn-sm" :class="{ 'btn-success': game.isFinishedCompletionist, 'btn-danger': !game.isFinishedCompletionist }">
                  <fa icon="check" fixed-width v-if="game.isFinishedCompletionist"/>
                  <fa icon="ban" fixed-width v-else/>
                  Completionist
                  <small v-if="game.isFinishedCompletionist">(done)</small>
                </button>
              </div>
            </div>
            <div class="card-body col">
              <dl class="row">
                <dt class="col-6">Main</dt>
                <dd class="col-6">
                  <fa icon="spinner" spin v-if="!game.isFinishedMain" class="text-info" fixed-width/>
                  <fa icon="check" class="text-success" v-else fixed-width/>
                  {{ getHours(game.timeToBeatMain).toFixed(1) }}<small class="small">h</small> / {{ game.gameplayMain }}<small class="small">h</small>
                  <span class="percent">
                    {{ ((getHours(game.timeToBeatMain) / game.gameplayMain) * 100).toFixed(2) }}<small class="small">%</small>
                  </span>
                </dd>
                <dt class="col-6">Completionist</dt>
                <dd class="col-6">
                  <fa icon="spinner" spin v-if="!game.isFinishedCompletionist" class="text-info"/>
                  <fa icon="check" class="text-success" v-else/>
                  {{ getHours(game.timeToBeatCompletionist).toFixed(1) }}<small class="small">h</small> / {{ game.gameplayCompletionist }}<small class="small">h</small>
                  <span class="percent">
                    {{ ((getHours(game.timeToBeatCompletionist) / game.gameplayCompletionist) * 100).toFixed(2) }}<small class="small">%</small>
                  </span>
                </dd>
              </dl>
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
        interval: number,
        games: import('../../../bot/systems/howlongtobeat').Game[],
        domWidth: number,
      } = {
        socket: io('/systems/howlongtobeat', { query: "token=" + this.token }),
        games: [],
        itemsPerLine: 2,
        interval: 0,
        domWidth: 1080,
      }
      return object
    },
    beforeDestroy() {
      window.clearInterval(this.interval);
    },
    created() {
      this.interval = window.setInterval(() => {
        this.domWidth = (this.$refs['window'] as HTMLElement).clientWidth
      }, 100)
      this.socket.emit('find', {}, (err, data) => {
        if (err) return console.error(err)
        this.games = this._.orderBy(data, 'startedAt', 'desc')
      })
    },
    watch: {
      domWidth(val) {
        if (val < 800) {
          this.itemsPerLine = 1
        } else if (val < 1200) {
          this.itemsPerLine = 2
        } else {
          this.itemsPerLine = 3
        }
      }
    },
    methods: {
      update(attr: string, value: boolean, game: string) {
        this.socket.emit('update', { collection: 'data', key: 'game', items: [{ game, [attr]: value}]})
      },
      getHours(time: number): number {
        return Number(time / 1000 / 60 / 60)
      }
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
  font-size: 1.4rem;
}
.small {
  font-size: 0.6rem;
}

img.max {
  max-height: 250px;
}
</style>