<template>
  <b-container fluid ref="window">
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.quotes') }}
          <template v-if="search.length > 0">
            <small>
              <fa icon="search"/>
            </small>
            {{ search }}
          </template>
        </span>
        <div class="text-right" style="float:right" v-if="quotesFromDb.length > 0">
          <strong>{{ translate('systems.quotes.tag-filter') }}</strong>
          <span class="border-0 bg-light widget p-1" style="height: auto; line-height: 3rem; word-break: break-all;">
            <span v-for="tag of tags"
                  v-bind:key="tag"
                  v-on:click="toggleTags(tag)"
                  v-bind:class="[ filteredTags.includes(tag) ? 'bg-success' : 'bg-dark' ]"
                  class="p-2 m-1 text-light"
                  style="cursor: pointer;">{{ tag }}</span>
          </span>
        </div>
      </b-col>
      <b-col v-if="!$systems.find(o => o.name === 'quotes').enabled" style=" text-align: right;">
        <b-alert show variant="danger" style="padding: .5rem; margin: 0; display: inline-block;">
          <fa icon="exclamation-circle" fixed-width/> {{ translate('this-system-is-disabled') }}
        </b-alert>
      </b-col>
    </b-row>

    <panel search @search="search = $event">
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" @click="newItem">{{translate('systems.quotes.new')}}</button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loading === $state.progress || state.settings === $state.progress" />
    <template v-else>
      <b-sidebar
        @change="isSidebarVisibleChange"
        :visible="isSidebarVisible"
        :no-slide="!sidebarSlideEnabled"
        width="600px"
        no-close-on-route-change
        shadow
        no-header
        right
        backdrop>
        <template v-slot:footer="{ hide }">
          <div class="d-flex bg-opaque align-items-center px-3 py-2 border-top border-gray" style="justify-content: flex-end">
            <b-button class="mx-2" @click="hide" variant="link">{{ translate('dialog.buttons.close') }}</b-button>
            <state-button @click="save()" text="saveChanges" :state="state.save" :invalid="!!$v.$invalid && !!$v.$dirty"/>
          </div>
        </template>
        <div class="px-3 py-2">
          <loading v-if="!editationItem" />
          <b-form v-else>
            <b-form-group
              :label="translate('systems.quotes.quote.name')"
              label-for="quote"
            >
              <b-form-input
                id="quote"
                v-model="editationItem.quote"
                type="text"
                :placeholder="translate('systems.quotes.quote.placeholder')"
                @input="$v.editationItem.quote.$touch()"
                :state="$v.editationItem.quote.$invalid && $v.editationItem.quote.$dirty ? false : null"
              ></b-form-input>
              <b-form-invalid-feedback :state="!($v.editationItem.quote.$invalid && $v.editationItem.quote.$dirty)">{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
            </b-form-group>

            <b-form-group
              :label="translate('systems.quotes.by.name')"
              label-for="quotedBy"
            >
              <b-form-input
                id="quotedBy"
                :disabled="true"
                v-model="quotedByName"
                type="text"
              ></b-form-input>
            </b-form-group>

            <b-form-group
              :label="translate('systems.quotes.tags.name')"
              :description="translate('systems.quotes.tags.help')"
              label-for="tags"
            >
              <b-form-input
                id="tags"
                v-model="tagsString"
                type="text"
                :placeholder="translate('systems.quotes.tags.placeholder')"
              ></b-form-input>
            </b-form-group>
          </b-form>
        </div>
      </b-sidebar>
      <b-alert show variant="danger" v-if="quotes.length === 0 && search.length > 0">
        <fa icon="search"/> <span v-html="translate('systems.quotes.emptyAfterSearch').replace('$search', search)"/>
      </b-alert>
      <b-alert show v-else-if="quotes.length === 0">
        {{translate('systems.quotes.empty')}}
      </b-alert>
      <b-table v-else :fields="fields" :items="quotes" hover small style="cursor: pointer;" @row-clicked="linkTo($event)">
        <template v-slot:cell(createdAt)="data">
          {{ dayjs(data.item.createdAt).format('LL')}} {{ dayjs(data.item.createdAt).format('LTS') }}
        </template>

        <template v-slot:cell(quotes)="data">
          <span style="word-break: break-word;"> {{ data.item.quote }}</span>
        </template>

        <template v-slot:cell(tags)="data">
          <span class="p-2 m-1 text-light bg-dark" v-for="tag of data.item.tags" v-bind:key="tag" variant="dark">{{ tag }}</span>
        </template>

        <template v-slot:cell(quotedByName)="data">
          <router-link :to="{ name: 'viewersManagerEdit', params: { id: data.item.quotedBy }}">
            {{ data.item.quotedByName }}&nbsp;<small class="text-muted">{{ data.item.quotedBy }}</small>
          </router-link>
        </template>

        <template v-slot:cell(buttons)="data">
          <div class="text-right">
            <button-with-icon class="btn-only-icon btn-primary btn-reverse" icon="edit" v-bind:href="'#/manage/quotes/edit/' + data.item.id">
              {{ translate('dialog.buttons.edit') }}
            </button-with-icon>
            <button-with-icon class="btn-only-icon btn-danger btn-reverse" icon="trash" @click="del(data.item.id)">
              {{ translate('dialog.buttons.delete') }}
            </button-with-icon>
          </div>
        </template>
      </b-table>
    </template>
  </b-container>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, getCurrentInstance, computed, watch } from '@vue/composition-api'
import { QuotesInterface } from 'src/bot/database/entity/quotes';
import { getSocket } from 'src/panel/helpers/socket';
import { orderBy, uniq, xor, flatten } from 'lodash-es';
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import translate from 'src/panel/helpers/translate';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { error } from 'src/panel/helpers/error';
import { getUsernameById } from 'src/panel/helpers/userById';
import { dayjs } from 'src/bot/helpers/dayjs';

const socket = getSocket('/systems/quotes');

export default defineComponent({
  mixins: [ validationMixin ],
  components: {
    'loading': () => import('src/panel/components/loading.vue'),
  },
  validations: {
    editationItem: {
      quote: {required},
    }
  },
  setup(props, ctx) {
    const instance = getCurrentInstance()?.proxy;
    const isSidebarVisible = ref(false);
    const sidebarSlideEnabled = ref(true);

    const quotesFromDb = ref([] as QuotesInterface[]);
    const editationItem = ref(null as QuotesInterface | null);
    const filteredTags = ref([] as string[]);
    const search = ref('');

    const quotedByName = ref('');
    const tagsString = ref('');

    const fields = [
      { key: 'createdAt', label: translate('systems.quotes.date.name'), sortable: true },
      { key: 'quote', label: translate('systems.quotes.quote.name'), sortable: true },
      { key: 'tags', label: translate('systems.quotes.tags.name') },
      { key: 'quotedByName', label: translate('systems.quotes.by.name'), sortable: true },
      // virtual attributes
      { key: 'buttons', label: '' },
    ];

    const state = ref({
      loading: ButtonStates.progress,
      save: ButtonStates.idle,
      pending: false,
    } as {
      settings: number,
      loading: number,
      save: number,
      pending: boolean,
    })

    watch(() => ctx.root.$route.params.id, (val) => {
      const $v = instance?.$v;
      $v?.$reset();
      if (val) {
        isSidebarVisible.value = true;
      } else {
        state.value.pending = false;
      }
    })
    watch([editationItem, tagsString], (val, oldVal) => {
      if (val !== null && oldVal !== null) {
        state.value.pending = true;
      }
    }, { deep: true });

    onMounted(() => {
      refresh();
      loadEditationItem();
      if (ctx.root.$route.params.id) {
        isSidebarVisible.value = true;
      }
    });

    const refresh = () => {
      socket.emit('quotes:getAll', {}, async (err: string | null, items: QuotesInterface[]) => {
        quotesFromDb.value = items
        state.value.loading = ButtonStates.success;
      })
    };

    const quotes = computed(() => {
      let quotesFilteredBySearch: QuotesInterface[] = []
      if (search.value.trim().length > 0) {
        for (let quote of quotesFromDb.value) {
          if (quote.quote.toLowerCase().includes(search.value)) {
            quotesFilteredBySearch.push(quote);
          }
        }
      } else {
        quotesFilteredBySearch = quotesFromDb.value;
      }
      if (filteredTags.value.length === 0) return quotesFilteredBySearch
      else {
        let quotesFilteredByTags: QuotesInterface[] = []
        for (let quote of quotesFilteredBySearch) {
          for (let tag of quote.tags) {
            if (filteredTags.value.includes(tag)) {
              quotesFilteredByTags.push(quote);
              break
            }
          }
        }
        return quotesFilteredByTags
      }
    });

    const tags = computed(() => {
      let tags: string[][] = []
      for (let quote of quotesFromDb.value) tags.push(quote.tags)
      return orderBy(uniq(flatten(tags)))
    });

    const toggleTags = (tag: string) => {
      filteredTags.value = xor(filteredTags.value, [tag])
    }

    const save = () =>  {
      const $v = instance?.$v;
      $v?.$touch();
      if (!$v?.$invalid) {
        state.value.save = ButtonStates.progress;

        socket.emit('generic::setById', {
          id: ctx.root.$route.params.id,
          item: { ...editationItem.value, tags: tagsString.value.split(',').map(o => o.trim()) }
        }, (err: string | null, data: QuotesInterface) => {
          if (err) {
            state.value.save = ButtonStates.fail;
            return error(err);
          } else {
            console.groupCollapsed('generic::setById')
            console.log({data})
            console.groupEnd();
            state.value.save = ButtonStates.success;
            ctx.root.$nextTick(() => {
              refresh();
              state.value.pending = false;
              ctx.root.$router.push({ name: 'QuotesManagerEdit', params: { id: String(data.id) } }).catch(() => {});
            });
          }
          setTimeout(() => {
            state.value.save = ButtonStates.idle;
          }, 1000)
        });
      }
    }
    const del = (id: number) => {
      if (confirm('Do you want to delete alias ' + quotesFromDb.value.find(o => o.id === id)?.quote + '?')) {
        socket.emit('generic::deleteById', id, (err: string | null) => {
          if (err) {
            return error(err);
          }
          refresh();
        })
      }
    }
    const isSidebarVisibleChange = (isVisible: boolean, ev: any) => {
      if (!isVisible) {
        if (state.value.pending) {
          const isOK = confirm('You will lose your pending changes. Do you want to continue?')
          if (!isOK) {
            sidebarSlideEnabled.value = false;
            isSidebarVisible.value = false;
            ctx.root.$nextTick(() => {
              isSidebarVisible.value = true;
              setTimeout(() => {
                sidebarSlideEnabled.value = true;
              }, 300);
            });
            return;
          }
        }
        isSidebarVisible.value = isVisible;
        ctx.root.$router.push({ name: 'QuotesManagerList' }).catch(() => {});
      } else {
        if (sidebarSlideEnabled.value) {
          editationItem.value = null
          loadEditationItem();
        }
      }
    }
    const loadEditationItem = () => {
      if (ctx.root.$route.params.id) {
        socket.emit('generic::getOne', ctx.root.$route.params.id, async (err: string | null, data: QuotesInterface) => {
          if (err) {
            return error(err);
          }
          console.debug({data})
          if (data === null) {
            // we are creating new item
            editationItem.value = {
              id: undefined,
              createdAt: Date.now(),
              tags: [],
              quotedBy: ctx.root.$store.state.loggedUser.id,
              quote: '',
            }
            tagsString.value = '';
            quotedByName.value = await getUsernameById(editationItem.value.quotedBy);
            state.value.pending = false;
          } else {
            editationItem.value = data;
            tagsString.value = data.tags.map(o => o.trim()).join(', ');
            quotedByName.value = await getUsernameById(data.quotedBy);
            state.value.pending = false;
          }
        })
      } else {
        editationItem.value = null;
      }
    }

    const linkTo = (item: Required<QuotesInterface>) => {
      console.debug('Clicked', item.id);
      ctx.root.$router.push({ name: 'QuotesManagerEdit', params: { id: String(item.id) } });
    }
    const newItem = () => {
      ctx.root.$router.push({ name: 'QuotesManagerEdit', params: { id: String(0) } }).catch(() => {});
    };

    return {
      fields,
      state,
      search,
      quotes,
      quotesFromDb,
      quotedByName,
      tagsString,
      tags,
      toggleTags,
      filteredTags,
      linkTo,
      editationItem,
      sidebarSlideEnabled,
      isSidebarVisibleChange,
      isSidebarVisible,
      save,
      newItem,
      del,
      dayjs,
      translate,
    }
  }
});
</script>
