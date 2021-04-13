<template>
  <b-modal
    ref="modalWindow"
    v-model="show"
    size="w-90"
    :title="translate('change-game')"
    no-fade
  >
    <div
      v-if="games.length > 0"
      class="d-flex text-center"
    >
      <button
        class="btn btn-lg btn-block btn-outline-dark border-0 p-3"
        style="width: fit-content;flex: max-content;"
        :disabled="carouselPage === 0"
        @click="carouselPage--;"
      >
        <font-awesome-icon icon="caret-left" />
      </button>

      <div
        class="w-100 d-flex"
        style="flex-wrap: wrap;justify-content: center;"
        :style="{
          height: '154px',
          overflow: 'hidden',
        }"
      >
        <div
          v-for="game of chunk(games, thumbnailsPerPage)[carouselPage]"
          :key="game"
          class="d-flex onHover m-1"
          style="flex-direction: column; margin-top: 0.55rem !important;"
          :style="{
            width: (90 / thumbnailsPerPage) + '%',
          }"
        >
          <div class="buttonToShow">
            <hold-button
              class="btn-danger w-100"
              small
              @trigger="deleteGame(game)"
            >
              <template slot="title">
                {{ translate('dialog.buttons.delete') }}
              </template>
              <template slot="onHoldTitle">
                {{ translate('dialog.buttons.delete') }}
              </template>
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
            @click="manuallySelected = true; currentGame = game"
          >
        </div>
      </div>

      <button
        class="btn btn-lg  btn-block btn-outline-dark border-0 p-3"
        style="width: fit-content;flex: max-content;"
        :disabled="(carouselPage + 1) === chunk(this.games, 6).length"
        @click="carouselPage++;"
      >
        <font-awesome-icon icon="caret-right" />
      </button>
    </div>

    <search
      class="mt-2 mb-4"
      :placeholder="translate('create-and-use-a-new-game')"
      :options="searchForGameOpts"
      :value="[currentGame]"
      @search="searchForGame($event);"
      @input="currentGame = $event"
    />

    <h5 class="modal-title">
      {{ translate('change-title') }} <small>{{ translate('for') }} {{ currentGame }}</small>
    </h5>
    <div
      v-for="(title, index) of titles"
      :key="index"
    >
      <b-input-group @mousedown="selectedTitle = typeof title.id === 'undefined' ? (index === 0 ? 'current' : 'new') : title.id">
        <b-input-group-prepend is-text>
          <b-form-radio
            v-model="selectedTitle"
            plain
            name="selectedTitle"
            :value="typeof title.id === 'undefined' ? (index === 0 ? 'current' : 'new') : title.id"
          />
        </b-input-group-prepend>
        <b-form-input
          v-if="title.id === 'new'"
          v-model="newTitle"
          :placeholder="['current', 'new'].includes(title.id) ? translate('create-and-use-a-new-title') : ''"
        />
        <b-form-input
          v-else
          v-model="title.title"
          :placeholder="['current', 'new'].includes(title.id) ? translate('create-and-use-a-new-title') : ''"
          :disabled="typeof title.id === 'undefined' && index === 0"
        />
        <button
          v-if="!['current', 'new'].includes(title.id) && index !== 0"
          slot="append"
          class="btn btn-danger"
          @click="deleteTitle(title.id)"
        >
          <font-awesome-icon icon="trash" />
        </button>
      </b-input-group>
    </div>

    <h5 class="modal-title mt-4">
      {{ translate('tags') }}
    </h5>
    <search
      class="mt-2 mb-4"
      :placeholder="translate('search-tags')"
      :options="searchForTagsOpts"
      :value="currentTags"
      multiple
      show-all-options
      @search="searchForTags($event);"
      @input="currentTags = $event"
    />

    <div
      slot="modal-footer"
      class="w-100"
    >
      <b-button
        v-if="saveState === -1"
        variant="danger"
        class="float-right"
      >
        {{ translate('dialog.buttons.something-went-wrong') }}
      </b-button>
      <b-button
        v-else-if="saveState === 0"
        variant="primary"
        class="float-right"
        @click="handleOk"
      >
        {{ translate('dialog.buttons.saveChanges.idle') }}
      </b-button>
      <b-button
        v-else-if="saveState === 1"
        :disabled="true"
        variant="primary"
        class="float-right"
      >
        <fa
          icon="spinner"
          spin
        /> {{ translate('dialog.buttons.saveChanges.progress') }}
      </b-button>
      <b-button
        v-else-if="saveState === 2"
        variant="success"
        class="float-right"
      >
        {{ translate('dialog.buttons.saveChanges.done') }}
      </b-button>

      <b-button
        variant="danger"
        class="float-right mr-2"
        @click="show=false"
      >
        {{ translate('close') }}
      </b-button>
    </div>
  </b-modal>
</template>

<script lang="ts">
import { getConfiguration, getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  computed, defineComponent, onMounted, onUnmounted, ref, watch,
} from '@vue/composition-api';
import type { Ref } from '@vue/composition-api';
import { ModalPlugin } from 'bootstrap-vue';
import { chunk, debounce } from 'lodash-es';
import Vue from 'vue';

import { EventBus } from 'src/panel/helpers/event-bus';

Vue.use(ModalPlugin);

type Tag = {
  tag_id: string;
  locale: string;
  value: string;
  is_auto: boolean;
};

export default defineComponent({
  components: { search: () => import('../searchDropdown.vue') },
  setup(props, context) {
    const data: Ref<{ id: string, game: string, title: string }[]> = ref([]);
    const currentGame: Ref<string | null> = ref(null);
    const currentTitle = ref('');
    const carouselPage = ref(0);
    const manuallySelected = ref(false);
    const games: Ref<string[]> = ref([]);
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
        {
          game: currentGame.value, title: '', id: 'new',
        },
      ];
    });

    watch([manuallySelected, currentGame], (val) => {
      if (!manuallySelected.value && currentGame.value) {
        // reorder
        games.value = [
          ...new Set([
            currentGame.value,
            ...data.value.sort((a: any,b: any) => {
              if (typeof a.timestamp === 'undefined') {
                a.timestamp = 0;
              }
              if (typeof b.timestamp === 'undefined') {
                b.timestamp = 0;
              }
              if (a.timestamp > b.timestamp) {
                return -1;
              } else if (a.timestamp < b.timestamp) {
                return 1;
              } else {
                return 0;
              }
            }).map((o: any) => o.game),
          ],
          )];
      } else {
        games.value = [...new Set(data.value.sort((a: any,b: any) => {
          if (typeof a.timestamp === 'undefined') {
            a.timestamp = 0;
          }
          if (typeof b.timestamp === 'undefined') {
            b.timestamp = 0;
          }
          if (a.timestamp > b.timestamp) {
            return -1;
          } else if (a.timestamp < b.timestamp) {
            return 1;
          } else {
            return 0;
          }
        }).map((o: any) => o.game))];
      }
    });

    const socket = getSocket('/');

    const _resizeListener = () => windowWidth.value = window.innerWidth;
    const deleteGame = (game: string) => {
      data.value = data.value.filter(o => o.game !== game);
      // remove from order cache
      games.value.splice(games.value.findIndex(o => o === game), 1);
      currentGame.value = games.value[0];
    };
    const deleteTitle = (id: string) => {
      data.value.splice(data.value.findIndex(o => o.id === id), 1);
      selectedTitle.value = 'current';
    };
    const init = async () => {
      currentGame.value = null;
      manuallySelected.value = false;
      searchForTags(''); // buildup opts
      selectedTitle.value = 'current';
      newTitle.value = '';
      carouselPage.value = 0;
      socket.emit('getCachedTags', (socketCachedTags: Tag[]) => {
        cachedTags.value = socketCachedTags.filter(o => !o.is_auto);
      });
      socket.emit('getUserTwitchGames');

      if (!currentGame.value) {
        const configuration = await getConfiguration();
        currentGame.value = context.root.$store.state.currentGame;
        currentTitle.value = context.root.$store.state.currentTitle;
        currentTags.value = context.root.$store.state.currentTags.filter((o: any) => !o.is_auto).map((o: any) => {
          const key = Object.keys(o.localization_names).find(key2 => key2.includes(configuration.lang as string));
          return o.localization_names[key || 'en-us'];
        });
      }
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
          return o && o.toLowerCase().includes(value) && !currentTags.value.includes(o);
        }).sort((a, b) => {
          if (a < b)  { //sort string ascending
            return -1;
          }
          if (a > b) {
            return 1;
          }
          return 0; //default return value (no sorting)
        }),
      ));
      for (const val of arraySet) {
        searchForTagsOpts.value.push(val);
      }
    };
    const handleOk = () => {
      let title = '';
      if (selectedTitle.value === 'current') {
        title = currentTitle.value;
      } else if (selectedTitle.value === 'new') {
        title = newTitle.value;
      } else {
        title = (data.value.find(o => o.id === selectedTitle.value) || { title: '' }).title;
      }

      const emit = {
        game: currentGame.value,
        title,
        tags: currentTags.value,
      };

      context.root.$store.commit('setCurrentGame', emit.game);
      context.root.$store.commit('setCurrentTitle', emit.title);
      context.root.$store.commit('setCurrentTags', emit.tags);

      console.debug('EMIT [updateGameAndTitle]', emit);
      saveState.value = 1;
      socket.emit('updateGameAndTitle', emit, (err: string | null) => {
        if (err) {
          saveState.value = -1;
        } else {
          saveState.value = 2;
          show.value = false;
          const emitData = {
            game:   currentGame.value,
            title,
            titles: data.value,
          };
          console.debug('EMIT [cleanupGameAndTitle]', emitData);
          socket.emit('cleanupGameAndTitle', emitData, (_err: string | null, dataSocket: any) => {
            data.value = dataSocket;
          });
        }
        setTimeout(() => {
          saveState.value = 0;
        }, 1000);
      });
    };

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
    watch(currentTags, () => searchForTags(''));

    onMounted(() => {
      windowWidth.value = window.innerWidth;
      window.addEventListener('resize', _resizeListener);

      init();
      socket.on('sendGameFromTwitch', (data2: string[]) => searchForGameOpts.value = data2);
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
    });
    onUnmounted(() => window.removeEventListener('resize', _resizeListener));

    return {
      manuallySelected, carouselPage, show, newTitle, searchForTagsOpts, currentTags, handleOk, selectedTitle, currentGame, games, titles, saveState, chunk, thumbnailsPerPage, deleteGame, deleteTitle, searchForTags, searchForGame, searchForGameOpts, translate,
    };
  },
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