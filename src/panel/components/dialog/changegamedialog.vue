
<template>
  <b-modal size="w-90" :title="translate('change-game')" no-fade v-model="show" ref="modalWindow">
    <div class="d-flex text-center" v-if="games.length > 0">
      <button class="btn btn-lg btn-block btn-outline-dark border-0 p-3" style="width: fit-content;flex: max-content;" @click="carouselPage--;" :disabled="carouselPage === 0">
        <font-awesome-icon icon="caret-left"></font-awesome-icon>
      </button>

      <div class="w-100 d-flex" style="flex-wrap: wrap;justify-content: center;"
        :style="{
          height: '154px',
          overflow: 'hidden',
        }">
        <div
          v-for="game of chunk(games, thumbnailsPerPage)[carouselPage]"
          class="d-flex onHover m-1"
          style="flex-direction: column; margin-top: 0.55rem !important;"
          :style="{
            width: (90 / thumbnailsPerPage) + '%',
          }"
          :key="game">
          <div class="buttonToShow">
            <hold-button @trigger="deleteGame(game)" class="btn-danger w-100" small>
              <template slot="title">{{translate('dialog.buttons.delete')}}</template>
              <template slot="onHoldTitle">{{translate('dialog.buttons.delete')}}</template>
            </hold-button>
          </div>
          <img
              :style="{
                'border-bottom': '0.3rem solid',
                'border-color': game !== currentGame ? 'transparent !important' : undefined
              }"
              class="border-warning"
              :src="'https://static-cdn.jtvnw.net/ttv-boxart/' + encodeURIComponent(game) + '-100x140.jpg'"
              :title="game"
              @click="manuallySelected = true; currentGame = game"/>
        </div>
      </div>

      <button class="btn btn-lg  btn-block btn-outline-dark border-0 p-3" style="width: fit-content;flex: max-content;" @click="carouselPage++;" :disabled="(carouselPage + 1) === chunk(this.games, 6).length">
        <font-awesome-icon icon="caret-right"></font-awesome-icon>
      </button>
    </div>

    <search
      class="mt-2 mb-4"
      :placeholder="translate('create-and-use-a-new-game')"
      :options="searchForGameOpts"
      :value="currentGame"
      @search="searchForGame($event);"
      @input="currentGame = $event"></search>

    <h5 class="modal-title">
      {{ translate('change-title') }} <small>{{ translate('for') }} {{ currentGame }}</small>
    </h5>
    <div v-for="(title, index) of titles" :key="index">
      <b-input-group @mousedown="selectedTitle = typeof title.id === 'undefined' ? (index === 0 ? 'current' : 'new') : title.id">
        <b-input-group-prepend is-text>
          <b-form-radio plain v-model="selectedTitle" name="selectedTitle" :value="typeof title.id === 'undefined' ? (index === 0 ? 'current' : 'new') : title.id"></b-form-radio>
        </b-input-group-prepend>
        <b-form-input :placeholder="['current', 'new'].includes(title.id) ? translate('create-and-use-a-new-title') : ''" v-if="title.id === 'new'" v-model="newTitle"></b-form-input>
        <b-form-input :placeholder="['current', 'new'].includes(title.id) ? translate('create-and-use-a-new-title') : ''" v-else v-model="title.title" :disabled="typeof title.id === 'undefined' && index === 0"></b-form-input>
        <button slot="append" v-if="!['current', 'new'].includes(title.id) && index !== 0" class="btn btn-danger" @click="deleteTitle(title.id)">
          <font-awesome-icon icon="trash"/>
        </button>
      </b-input-group>
    </div>

    <h5 class="modal-title mt-4">
      {{ translate('tags')}}
    </h5>

    <search
      class="mt-2 mb-4"
      :placeholder="translate('search-tags')"
      :options="searchForTagsOpts"
      :value="currentTags"
      @search="searchForTags($event);"
      @input="currentTags = $event"
      multiple></search>

    <div slot="modal-footer" class="w-100">
      <b-button
        v-if="saveState === -1"
        variant="danger"
        class="float-right"
      >{{ translate('dialog.buttons.something-went-wrong')}}</b-button>
      <b-button
        v-else-if="saveState === 0"
        variant="primary"
        class="float-right"
        @click="handleOk"
      >{{ translate('dialog.buttons.saveChanges.idle')}}</b-button>
      <b-button
        v-else-if="saveState === 1"
        :disabled="true"
        variant="primary"
        class="float-right"
      ><fa icon="spinner" spin/> {{ translate('dialog.buttons.saveChanges.progress')}}</b-button>
      <b-button
        v-else-if="saveState === 2"
        variant="success"
        class="float-right"
      >{{ translate('dialog.buttons.saveChanges.done')}}</b-button>

      <b-button
        variant="danger"
        class="float-right mr-2"
        @click="show=false"
      >{{ translate('close')}}</b-button>
    </div>
  </b-modal>
</template>

<script lang="ts">
  import Vue from 'vue'
  import { ModalPlugin } from 'bootstrap-vue';
  Vue.use(ModalPlugin);
  import { defineComponent, ref, onUnmounted, onMounted, watch, computed } from '@vue/composition-api'
  import type { Ref } from '@vue/composition-api'
  import { chunk, debounce } from 'lodash-es'

  import { EventBus } from 'src/panel/helpers/event-bus';
  import { getSocket, getConfiguration } from 'src/panel/helpers/socket';

type Tag = {
    tag_id: string;
    locale: string;
    value: string;
    is_auto: boolean;
  }

export default defineComponent({
  components: {
    search: () => import('../searchDropdown.vue'),
  },
  setup(props, context) {
    const data: Ref<{ id: string, game: string, title: string }[]> = ref([]);
    const currentGame: Ref<string | null> = ref(null);
    const currentTitle = ref('');
    const carouselPage = ref(0);
    const manuallySelected = ref(false);
    const cachedGamesOrder: Ref<string[]> = ref([]);
    const searchForGameOpts: Ref<string[]> = ref([]);
    const searchForTagsOpts: Ref<string[]> = ref([]);
    const selectedTitle = ref('current');
    const newTitle = ref('');
    const currentTags: Ref<string[]> = ref([]);
    const cachedTags: Ref<Tag[]> = ref([]);

    const saveState = ref(0);
    const show = ref(false);

    const windowWidth = ref(0);
    const thumbnailsPerPage = ref(6);

    const titles = computed(() => {
      // first title is always current, last must be empty as new
      return [
        { game: currentGame.value, title: currentTitle.value },
        ...data.value.filter((o: any) => o.game === currentGame.value),
        { game: currentGame.value, title: '', id: 'new' }
        ]
    });
    const games = computed(() => {
      if (manuallySelected.value) {
        return cachedGamesOrder.value;
      } else if (currentGame.value) {
        cachedGamesOrder.value = [
          ...new Set([
            currentGame.value,
            ...data.value.sort((a: any,b: any) => {
              if (typeof a.timestamp === 'undefined') { a.timestamp = 0; }
              if (typeof b.timestamp === 'undefined') { b.timestamp = 0; }
              if (a.timestamp > b.timestamp) {
                return -1;
              } else if (a.timestamp < b.timestamp) {
                return 1;
              } else {
                return 0;
              }
            }).map((o: any) => o.game)
          ]
        )];
      } else {
        cachedGamesOrder.value = [...new Set(data.value.sort((a: any,b: any) => {
          if (typeof a.timestamp === 'undefined') { a.timestamp = 0; }
          if (typeof b.timestamp === 'undefined') { b.timestamp = 0; }
          if (a.timestamp > b.timestamp) {
            return -1;
          } else if (a.timestamp < b.timestamp) {
            return 1;
          } else {
            return 0;
          }
        }).map((o: any) => o.game))];
      }
      return cachedGamesOrder.value;
    });

    const socket = getSocket('/');

    const _resizeListener = () => windowWidth.value = window.innerWidth;
    const deleteGame = (game: string) => {
      data.value = data.value.filter(o => o.game !== game);
      // remove from order cache
      cachedGamesOrder.value.splice(cachedGamesOrder.value.findIndex(o => o === game), 1);
      currentGame.value = cachedGamesOrder.value[0];
    }
    const deleteTitle = (id: string) => {
      data.value.splice(data.value.findIndex(o => o.id === id), 1);
      selectedTitle.value = 'current';
    };
    const init = () => {
      currentGame.value = null;
      manuallySelected.value = false;
      searchForTags(''); // buildup opts
      selectedTitle.value = 'current';
      newTitle.value = '';
      carouselPage.value = 0;
      socket.emit('getCachedTags', (socketCachedTags: Tag[]) => {
        cachedTags.value = socketCachedTags.filter(o => !o.is_auto);
      })
      socket.emit('getUserTwitchGames');

      socket.emit('panel.sendStreamData', async (err: string | null, data: any) => {
        if (err) {
          return console.error(err);
        }
        const configuration = await getConfiguration();
        console.groupCollapsed('changegamedialog::panel.sendStreamData')
        console.log(data)
        console.groupEnd();
        if (!currentGame.value) {
          currentGame.value = data.game;
          currentTitle.value = data.status;
          currentTags.value = data.tags.filter((o: any) => !o.is_auto).map((o: any) => {
            const key = Object.keys(o.localization_names).find(key => key.includes(configuration.lang as string))
            return o.localization_names[key || 'en-us'];
          })
        }
      });
    };
    const searchForGame = debounce((value: string)  => {
      if (value.trim().length !== 0) {
        socket.emit('getGameFromTwitch', value);
      } else {
        searchForGameOpts.value = [];
      }
    }, 500);
    const searchForTags = (value: string) => {
      while(searchForTagsOpts.value.length > 0) {
        searchForTagsOpts.value.shift();
      }
      const arraySet = Array.from(new Set(cachedTags.value
        .map(o => o.value)
        .filter(o => {
          return o && o.toLowerCase().includes(value) && !currentTags.value.includes(o)
        }).sort((a, b) => {
          if (a < b)  { //sort string ascending
            return -1;
          }
          if (a > b) {
            return 1;
          }
          return 0; //default return value (no sorting)
        })
      ));
      for (const val of arraySet) {
        searchForTagsOpts.value.push(val);
      }
    }
    const handleOk = () => {
      let title = '';
      if (selectedTitle.value === 'current') {
        title = currentTitle.value
      } else if (selectedTitle.value === 'new') {
        title = newTitle.value
      } else {
        title = (data.value.find(o => o.id === selectedTitle.value) || { title: '' }).title
      }
      console.debug('EMIT [updateGameAndTitle]', {
        game: currentGame.value,
        title,
        tags: currentTags.value,
      })
      saveState.value = 1
      socket.emit('updateGameAndTitle', {
        game: currentGame.value,
        title,
        tags: currentTags.value,
      }, (err: string | null) => {
        if (err) {
          saveState.value = -1;
        } else {
          saveState.value = 2;
          show.value = false;
          socket.emit('cleanupGameAndTitle', {
            game: currentGame.value,
            title,
            titles: data
          }, (err: string | null, dataSocket: any) => {
            data.value = dataSocket
          })
        }
        setTimeout(() => {
          saveState.value = 0;
        }, 1000);
      })
    }

    watch(windowWidth, (width) => {
      if (width < 304) {
        thumbnailsPerPage.value = 1;
      } else if (width < 393) {
        thumbnailsPerPage.value = 2;
      } else if (width < 481) {
        thumbnailsPerPage.value = 3;
      } else if (width < 570) {
        thumbnailsPerPage.value = 4;
      } else if (width < 700) {
        thumbnailsPerPage.value = 5;
      } else if (width < 800) {
        thumbnailsPerPage.value = 6;
      } else if (width < 900) {
        thumbnailsPerPage.value = 7;
      } else if (width < 1000) {
        thumbnailsPerPage.value = 8;
      } else if (width < 1100) {
        thumbnailsPerPage.value = 9;
      } else if (width < 1200) {
        thumbnailsPerPage.value = 10;
      } else if (width < 1300) {
        thumbnailsPerPage.value = 11;
      } else if (width < 1400) {
        thumbnailsPerPage.value = 12;
      } else if (width < 1500) {
        thumbnailsPerPage.value = 13;
      } else {
        thumbnailsPerPage.value = 14;
      }
    });
    watch(show, () => init());
    watch(currentGame, () => selectedTitle.value = 'current');

    onMounted(() => {
      windowWidth.value = window.innerWidth;
      window.addEventListener('resize', _resizeListener);

      init();
      socket.on('sendGameFromTwitch', (data: string[]) => searchForGameOpts.value = data);
      socket.on('sendUserTwitchGamesAndTitles', (data2: typeof data.value) => {
        while (data.value.length > 0) {
          data.value.shift();
        }
        data2.forEach(val => data.value.push(val));
      });

      EventBus.$on('show-game_and_title_dlg', () => {
        init();
        show.value = true;
        socket.emit('getUserTwitchGames');
      });
    })
    onUnmounted(() => window.removeEventListener('resize', _resizeListener))

    return { manuallySelected, carouselPage, show, newTitle, searchForTagsOpts, currentTags, handleOk, selectedTitle, currentGame, games, titles, saveState, chunk, thumbnailsPerPage, deleteGame, deleteTitle, searchForTags, searchForGame, searchForGameOpts }
  }
});
</script>

<style>
.onHover {
  transform: translateY(-44px);
}
.onHover > .buttonToShow {
  opacity: 0.9;
}
.onHover:hover > .buttonToShow {
  transition: all 2s;
  transform: translateY(35px);
}
</style>