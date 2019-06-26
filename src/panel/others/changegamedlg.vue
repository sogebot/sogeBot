
<template>
  <b-modal id="game_and_title_dlg" size="lg" :title="translate('change-game')" no-fade>
    <div class="d-flex text-center" v-if="games.length > 0" @dragleave="dragleave" @dragenter="dragenter">
      <button class="btn btn-lg btn-block btn-outline-dark border-0 p-3" style="width: fit-content;flex: max-content;" @click="carouselPage--;" :disabled="carouselPage === 0">
        <font-awesome-icon icon="caret-left"></font-awesome-icon>
      </button>

      <div class="w-100 d-flex" style="flex-wrap: wrap;justify-content: center;">
        <img v-for="game of _.chunk(games, 6)[carouselPage]"
            draggable="true"
            style="width: 15%;"
            @dragstart="dragstart(game)"
            @dragend="dragend(game)"
            class="m-1 border-warning"
            :key="game"
            :src="'https://static-cdn.jtvnw.net/ttv-boxart/' + encodeURIComponent(game) + '-100x140.jpg'"
            :title="game"
            :style="{ 'border-bottom': '0.3rem solid', 'border-color': game !== currentGame ? 'transparent !important' : undefined }"
            @click="manuallySelected = true; currentGame = game"/>
        <div @dragleave="dragleave"
             class="m-1"
             style="width: 15%; height: 1px;pointer-events: none"
             v-for="index in (6 - _.chunk(games, 6)[carouselPage].length)" :key="index"></div>
      </div>


      <button class="btn btn-lg  btn-block btn-outline-dark border-0 p-3" style="width: fit-content;flex: max-content;" @click="carouselPage++;" :disabled="(carouselPage + 1) === _.chunk(games, 6).length">
        <font-awesome-icon icon="caret-right"></font-awesome-icon>
      </button>
    </div>
    <v-select :placeholder="translate('create-and-use-a-new-game')" class="form-control mt-2 mb-4" :options="searchForGameOpts" @search="searchForGame($event);" :searchable="true" @input="currentGame = $event"></v-select>

    <h5 class="modal-title">
      {{ translate('change-title') }} <small>{{ translate('for') }} {{ currentGame }}</small>
    </h5>

    <div v-for="(title, index) of titles" :key="index">
      <b-input-group @click="selectedTitle = typeof title._id === 'undefined' ? (index === 0 ? 'current' : 'new') : title._id">
        <b-input-group-prepend is-text>
          <b-form-radio plain v-model="selectedTitle" name="selectedTitle" :value="typeof title._id === 'undefined' ? (index === 0 ? 'current' : 'new') : title._id"></b-form-radio>
        </b-input-group-prepend>
        <b-form-input :placeholder="typeof title._id === 'undefined' ? translate('create-and-use-a-new-title') : ''" v-model="title.title" :disabled="typeof title._id === 'undefined' && index === 0"></b-form-input>
        <button slot="append" v-if="typeof title._id !== 'undefined'" class="btn btn-danger" @click="data = data.filter(o => o._id !== title._id)">
          <font-awesome-icon icon="trash"/>
        </button>
      </b-input-group>
    </div>
  </b-modal>
</template>

<script lang="ts">
  import Vue from 'vue'
  import io from 'socket.io-client';
  import _ from 'lodash';

  import { EventBus } from '../helpers/event-bus';

  import { ModalPlugin } from 'bootstrap-vue';
  import vSelect from 'vue-select'
  import 'vue-select/dist/vue-select.css';

  Vue.use(ModalPlugin);
  Vue.component('v-select', vSelect)

  export default Vue.extend({
    data: function () {
      const object: {
        socket: any,
        data: {
          game: string,
          title: string,
          _id: string,
        }[],
        currentGame: null | string,
        currentTitle: string,
        carouselPage: number,
        manuallySelected: boolean
        cachedGamesOrder: string[],
        searchForGameOpts: string[],
        selectedTitle: any,
        draggingGame: string | null,
        draggingEnter: number,
        draggingTimestamp: number
      } = {
        socket: io('/', { query: "token=" + this.token }),
        data: [],
        currentGame: null,
        currentTitle: '',
        carouselPage: 0,
        manuallySelected: false,
        cachedGamesOrder: [],
        searchForGameOpts: [],
        selectedTitle: 'current',
        draggingGame: null,
        draggingEnter: 0,
        draggingTimestamp: Date.now(),
      }
      return object
    },
    watch: {
      currentGame() {
        this.selectedTitle = 'current';
      }
    },
    methods: {
      dragstart(game) {
        this.draggingEnter = 0;
        this.draggingGame = game;
      },
      dragleave() {
        this.draggingEnter--;
        this.draggingTimestamp = Date.now();
      },
      dragenter() {
        this.draggingEnter++;
      },
      dragend() {
        const timestamp = Date.now()
        this.$nextTick(() => {
          if (this.draggingEnter === 0 && this.draggingTimestamp - timestamp < -5) {
            this.data = this.data.filter(o => o.game !== this.draggingGame)
          }
          this.draggingGame = null;
        })
      },
      searchForGame(value) {
        if (value.trim().length !== 0) {
          this.socket.emit('getGameFromTwitch', value);
        } else {
          this.searchForGameOpts = [];
        }
      }
    },
    computed: {
      titles() {
        // first title is always current, last must be empty as new
        return [
          { game: (this as any).currentGame, title: (this as any).currentTitle },
          ...(this as any).data.filter(o => o.game === (this as any).currentGame),
          { game: (this as any).currentGame, title: '' }
          ]
      },
      games() {
        if (this.manuallySelected) {
          return (this as any).cachedGamesOrder;
        } else if (this.currentGame) {
          (this as any).cachedGamesOrder = [...new Set([(this as any).currentGame, ...(this as any).data.map(o => o.game)])];
        } else {
          (this as any).cachedGamesOrder = [...new Set((this as any).data.map(o => o.game))];
        }
        return (this as any).cachedGamesOrder;
      }
    },
    created() {
      this.searchForGame = _.debounce(this.searchForGame, 500);
    },
    mounted() {
      this.currentGame = null;
      this.manuallySelected = false;

      this.socket.on('sendGameFromTwitch', (data) => this.searchForGameOpts = data);
      this.socket.on('sendUserTwitchGamesAndTitles', (data) => this.data = data);
      this.socket.on('stats', (data) => {
        if (!this.currentGame) {
          this.currentGame = data.game;
          this.currentTitle = data.status;
          this.selectedTitle = 'current';
        }
      });

      EventBus.$on('show-game_and_title_dlg', () => {
        this.$bvModal.show('game_and_title_dlg');
        this.socket.emit('getUserTwitchGames');
      });
    }
  })
</script>

<style scoped>
</style>