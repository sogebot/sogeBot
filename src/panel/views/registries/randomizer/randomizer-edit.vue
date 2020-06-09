<template lang="pug">
  b-container(fluid ref="window")
    b-row
      b-col
        span.title.text-default.mb-2
          | {{ translate('menu.registry') }}
          small.px-2
            fa(icon="angle-right")
          | {{ translate('menu.randomizer') }}
          template(v-if="$route.params.id")
            small.px-2
              fa(icon="angle-right")
            | {{item.name}}
            small.text-muted.text-monospace.font-smaller.px-2
              | {{$route.params.id}}

    panel
      template(v-slot:left)
        button-with-icon(icon="caret-left" href="#/registry/randomizer/list").btn-secondary.btn-reverse {{ translate('commons.back') }}
        hold-button(v-if="$route.params.id" @trigger="del()" icon="trash").btn-danger
          template(slot="title") {{translate('dialog.buttons.delete')}}
          template(slot="onHoldTitle") {{translate('dialog.buttons.hold-to-delete')}}
      template(v-slot:right)
        button-with-icon(
          v-if="$route.params.id && state.loading === $state.success"
          @click="toggleVisibility"
          :class="{ 'btn-success': isShown, 'btn-danger': !isShown }"
          :icon="!isShown ? 'eye-slash' : 'eye'"
        ).btn-only-icon
        button-with-icon(
          v-if="$route.params.id && state.loading === $state.success && !spin"
          @click="startSpin"
          class="btn-secondary ml-0 mr-0"
          icon="dice"
        ).btn-only-icon
        button-with-icon(
          v-else-if="$route.params.id && state.loading === $state.success && spin"
          class="btn-secondary ml-0 mr-0"
          icon="circle-notch" spin disabled="disabled"
        ).btn-only-icon
        button-with-icon(
          v-if="$route.params.id && state.loading === $state.success"
          text="/overlays/randomizer"
          href="/overlays/randomizer"
          class="btn-dark mr-2 ml-0"
          icon="link"
          target="_blank"
        )
        b-alert(show variant="info" v-if="pending" v-html="translate('dialog.changesPending')").mr-2.p-2.mb-0
        state-button(@click="save()" text="saveChanges" :state="state.save" :invalid="!!$v.$invalid && !!$v.$dirty").btn-shrink

    loading(v-if="state.loading !== $state.success")
    b-form(v-else)
      b-form-group
        label(for="name")
          | {{ translate('registry.randomizer.form.name') }}
          span.text-warning  *
        b-input-group
          b-form-input(
            id="name"
            v-model.trim="item.name"
            type="text"
            @input="$v.item.name.$touch()"
            :state="$v.item.name.$invalid && $v.item.name.$dirty ? false : null"
          )
        b-form-invalid-feedback(:state="!($v.item.name.$invalid && $v.item.name.$dirty)") {{ translate('dialog.errors.required') }}
      b-form-group
        b-row
          b-col
            label(for="command") {{ translate('registry.randomizer.form.command') }}
            b-input-group
              b-form-input(
                id="command"
                v-model.trim="item.command"
                type="text"
                @input="$v.item.command.$touch()"
                :state="$v.item.command.$invalid && $v.item.command.$dirty ? false : null"
              )
            b-form-invalid-feedback(:state="!($v.item.command.$invalid && $v.item.command.$dirty)")
              template(v-if="!$v.item.command.sw") {{ translate('errors.command_must_start_with_!') }}
              template(v-else-if="!$v.item.command.minLength") {{ translate('errors.minLength_of_value_is').replace('$value', 2) }}
              template(v-else) {{ translate('dialog.errors.required') }}
          b-col
            label(for="permission_select") {{ translate('registry.randomizer.form.permission') }}
            b-input-group
              b-form-select(v-model="item.permissionId" :state="$v.item.permissionId.$invalid && $v.item.permissionId.$dirty ? false : null" id="permission_select")
                option(v-if="!getPermissionName(item.permissionId)" :key="item.permissionId" :value="item.permissionId" disabled) --- Permission not found ---
                option(v-for="p of permissions" :key="p.id" :value="p.id") {{ getPermissionName(p.id) | capitalize }}
              b-form-invalid-feedback(:state="!($v.item.permissionId.$invalid && $v.item.permissionId.$dirty)")
                | {{ translate('errors.permission_must_exist') }}
      b-form-group
        label(for="type_selector") {{ translate('registry.randomizer.form.type') }}
        b-form-select(v-model="item.type" id="type_selector")
          option(value="simple" key="simple") {{translate('registry.randomizer.form.simple')}}
          option(value="wheelOfFortune" key="wheelOfFortune") {{translate('registry.randomizer.form.wheelOfFortune')}}

      b-form-group(
        v-if="item.type === 'wheelOfFortune'"
        :label="translate('registry.randomizer.form.tick')"
        :label-for="'volume' + item.id")
        b-input-group.mb-2.mr-sm-2.mb-sm-0
          template(slot="prepend").pr-3.pl-3
            button(
              type="button"
              class="btn form-control"
              v-bind:class="{'btn-success': item.shouldPlayTick, 'btn-danger': !item.shouldPlayTick}"
              v-on:click="item.shouldPlayTick = !item.shouldPlayTick")
              template(v-if="item.shouldPlayTick") {{ translate('enabled') }}
              template(v-else) {{ translate('disabled') }}
          b-form-input(
            :id="'volume' + item.id"
            v-model.number="item.tickVolume"
            type="range"
            min="0"
            max="100"
            step="1")
          b-input-group-text(slot="append").pr-3.pl-3
            div(style="width: 3rem;") {{ item.tickVolume + '%' }}

      tts(:tts.sync="item.tts" :uuid="item.id")
      font(:data.sync="item.customizationFont" key="randomizer-font")

      b-card(no-body).mt-2
        b-card-header
          | {{ translate('registry.randomizer.form.options') }}
          b-button(variant="success" style="position: absolute; right: 0; top: 0; height: 3rem;" @click="addOption")
            fa(icon="plus" fixed-width)
        b-card-text
          b-table(striped small hover :items="item.items" :fields="fields" show-empty).m-0
            template(v-slot:empty="scope")
              b-alert(show).h-100.m-0.text-center {{translate('registry.randomizer.form.optionsAreEmpty')}}
            template(v-slot:cell(name)="data")
              b-input(
                v-model.trim="data.item.name"
                type="text"
              )
            template(v-slot:cell(color)="data")
              b-row.m-0
                b-input-group.col-12
                  b-input-group-prepend
                    b-button(
                      variant="append"
                      @click="data.item.color = getRandomColor()"
                    )
                      fa(icon="dice")
                  b-input(
                    v-model.trim="data.item.color"
                    type="text"
                  ).border-left-0
                  b-input-group-append(style="min-width: 40px;")
                    b-input(
                      v-model.trim="data.item.color"
                      type="color"
                    )
            template(v-slot:cell(numOfDuplicates)="data")
              b-input(
                v-if="!data.item.groupId"
                v-model.number="data.item.numOfDuplicates"
                type="number"
                min="1"
              )
              small(v-else)
                | {{ translate('registry.randomizer.form.groupedWithOptionAbove') }}
            template(v-slot:cell(minimalSpacing)="data")
              b-input(
                v-if="!data.item.groupId"
                v-model.number="data.item.minimalSpacing"
                type="number"
                min="0"
              )
              small(v-else)
                | {{ translate('registry.randomizer.form.groupedWithOptionAbove') }}
            template(v-slot:cell(buttons)="data")
              div(style="width: max-content !important;").float-right
                template(v-if="data.index > 0")
                  b-button(variant="dark" v-if="!data.item.groupId" @click="data.item.groupId = item.items[data.index - 1].id")
                    | {{ translate('registry.randomizer.form.groupUp') }}
                  b-button(variant="light" v-else @click="data.item.groupId = null")
                    | {{ translate('registry.randomizer.form.ungroup') }}
                hold-button(@trigger="rmOption(data.item.id)" icon="trash").btn-danger.btn-reverse.btn-only-icon
                  template(slot="title") {{translate('dialog.buttons.delete')}}
                  template(slot="onHoldTitle") {{translate('dialog.buttons.hold-to-delete')}}

      b-card(no-body).mt-2
        b-card-header
          | {{ translate('registry.randomizer.form.probability') }}
        b-card-text(style="overflow: auto;")
          b-list-group(style="flex-direction: row;").row.no-gutters
            b-list-group-item.col-6.col-sm-4.col-md-2.text-center(
              v-for="(uitem, index) of Array.from(new Set(item.items.map(o => o.name)))"
              :key="'probability' + index + uitem"
            )
              | {{ uitem }} &nbsp;
              strong {{Number((generateItems(item.items).filter(o => o.name === uitem).length / generateItems(item.items).length) * 100).toFixed(2)}}%
      b-card(no-body).mt-2.mb-5
        b-card-header
          | {{ translate('registry.randomizer.form.generatedOptionsPreview') }}
        b-card-text(style="overflow: auto;")
          b-alert(show v-if="generateItems(item.items).length === 0").h-100.m-0.text-center {{translate('registry.randomizer.form.optionsAreEmpty')}}
          b-list-group(horizontal="md")
            b-list-group-item(
              v-for="(item, index) of generateItems(item.items)"
              :key="index + item.id"
              v-bind:style="{ color: getContrastColor(item.color), 'background-color': item.color, 'min-width': 'fit-content' }"
            )
              | {{ item.name }}
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';

import { Route } from 'vue-router'
import { NextFunction } from 'express';

import { Validations } from 'vuelidate-property-decorators';
import { required, minValue } from 'vuelidate/lib/validators';
import { cloneDeep, isEqual } from 'lodash-es';

import { getSocket } from 'src/panel/helpers/socket';
import type { RandomizerInterface, RandomizerItemInterface } from 'src/bot/database/entity/randomizer';
import type { PermissionsInterface } from 'src/bot/database/entity/permissions';
import { v4 as uuid } from 'uuid';
import { permission } from 'src/bot/helpers/permissions';
import { getRandomColor, getContrastColor } from 'src/panel/helpers/color';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
library.add(faExclamationTriangle);

Component.registerHooks([
  'beforeRouteEnter',
  'beforeRouteLeave',
  'beforeRouteUpdate' // for vue-router 2.2+
])

@Component({
  components: {
    tts: () => import('../alerts/components/tts.vue'),
    font: () => import('src/panel/components/font.vue'),
    loading: () => import('../../../components/loading.vue'),
  },
  filters: {
    capitalize(value: string) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  }
})
export default class randomizerEdit extends Vue {
  getRandomColor = getRandomColor;
  getContrastColor = getContrastColor;
  psocket: SocketIOClient.Socket = getSocket('/core/permissions');
  socket: SocketIOClient.Socket =  getSocket('/registries/randomizer');

  fields = [
    { key: 'name', label: this.translate('registry.randomizer.form.name') },
    { key: 'color', label: this.translate('registry.randomizer.form.color') },
    { key: 'numOfDuplicates', label: this.translate('registry.randomizer.form.numOfDuplicates') },
    { key: 'minimalSpacing', label: this.translate('registry.randomizer.form.minimalSpacing') },
    { key: 'buttons', label: '' },
  ];

  state: {
    loading: number; save: number;
  } = {
    loading: this.$state.idle,
    save: this.$state.idle,
  };
  pending = false;
  spin = false;

  fonts: { text: string, value: string }[] = [];

  permissions: {id: string; name: string;}[] = [];
  isShown = false;
  item: Required<RandomizerInterface> = {
    id: uuid(),
    name: '',
    command: '',
    items: [],
    createdAt: Date.now(),
    permissionId: permission.CASTERS,
    isShown: false,
    shouldPlayTick: false,
    tickVolume: 1,
    type: 'simple',
    widgetOrder: -1,
    tts: {
      enabled: false,
      voice: 'English Female',
      pitch: 1,
      volume: 0.5,
      rate: 1,
    },
    customizationFont: {
      family: 'PT Sans',
      weight: 500,
      size: 16,
      borderColor: '#000000',
      borderPx: 1,
    }
  };

  @Validations()
  validations = {
    item: {
      name: {
        required,
      },
      command: {
        ifExistsMustBe: (value: string) => value.length === 0 || (value.startsWith('!') && value.length > 2),
      },
      permissionId: {
        mustBeExisting: (value: string) => !!this.getPermissionName(value),
      },
      customizationFont: {
        borderColor: {
          isColor: (value: string) => !!value.match(/^(#{1})([0-9A-F]{8}|[0-9A-F]{6})$/ig),
        },
        size: {
          required,
          minValue: minValue(1),
        },
        borderPx: {
          required,
          minValue: minValue(0),
        }
      }
    }
  }

  generateItems(items: Required<RandomizerItemInterface>[], generatedItems: Required<RandomizerItemInterface>[] = []) {
    const beforeItems = cloneDeep(items);
    items = cloneDeep(items);
    items = items.filter(o => o.numOfDuplicates > 0);


    const countGroupItems = (item: RandomizerItemInterface, count = 0): number => {
      const child = items.find(o => o.groupId === item.id);
      if (child) {
        return countGroupItems(child, count + 1);
      } else {
        return count;
      }
    }
    const haveMinimalSpacing = (item: Required<RandomizerItemInterface>) => {
      let lastIdx = generatedItems.map(o => o.name).lastIndexOf(item.name);
      const currentIdx = generatedItems.length;
      return lastIdx === -1 || lastIdx + item.minimalSpacing + countGroupItems(item) < currentIdx
    }
    const addGroupItems = (item: RandomizerItemInterface, generatedItems: RandomizerItemInterface[]) => {
      const child = items.find(o => o.groupId === item.id);
      if (child) {
        generatedItems.push(child);
        addGroupItems(child, generatedItems);
      }
    }

    for (const item of items) {

      if (item.numOfDuplicates > 0 && haveMinimalSpacing(item) && !item.groupId /* is not grouped or is parent of group */) {
        generatedItems.push(item);
        item.numOfDuplicates--;
        addGroupItems(item, generatedItems);
      }
    }

    // run next iteration if some items are still there and that any change was made
    // so we don't have infinite loop when e.g. minimalspacing is not satisfied
    if (items.filter(o => o.numOfDuplicates > 0).length > 0 && !isEqual(items.filter(o => o.numOfDuplicates > 0), beforeItems)) {
      this.generateItems(items, generatedItems);
    }
    return generatedItems;
  }

  @Watch('item', { deep: true })
  setPendingState() {
    if (this.state.loading === this.$state.success) {
      this.pending = true;
    }
  }

  beforeRouteUpdate(to: Route, from: Route, next: NextFunction) {
    if (this.pending) {
      const isOK = confirm('You will lose your pending changes. Do you want to continue?')
      if (!isOK) {
        next(false);
      } else {
        next();
      }
    } else {
      next();
    }
  }

  beforeRouteLeave(to: Route, from: Route, next: NextFunction) {
    if (this.pending) {
      const isOK = confirm('You will lose your pending changes. Do you want to continue?')
      if (!isOK) {
        next(false);
      } else {
        next();
      }
    } else {
      next();
    }
  }

  getPermissionName(id: string | null) {
    if (!id) return null
    const permission = this.permissions.find((o) => {
      return o.id === id
    })
    if (typeof permission !== 'undefined') {
      if (permission.name.trim() === '') {
        return permission.id
      } else {
        return permission.name
      }
    } else {
      return null
    }
  }

  addOption() {
    this.item.items.push({
      id: uuid(),
      name: '',
      color: getRandomColor(),
      numOfDuplicates: 1,
      minimalSpacing: 1,
      groupId: null,
      randomizer: undefined,
      randomizerId: undefined,
    })
  }

  rmOption(id: string) {
    this.item.items = this.item.items.filter(o => o.id !== id);
    for (const item of this.item.items.filter(o => o.groupId !== id)) {
      item.groupId = null;
    }
  }

  del() {
    this.socket.emit('randomizer::remove', this.item, (err: string | null) => {
      if (err) {
        console.error(err);
      } else {
        this.$router.push({ name: 'RandomizerRegistryList' });
      }
    })
  }

  startSpin() {
    this.spin = true;
    this.socket.emit('randomizer::startSpin', () => {});
    setTimeout(() => {
      this.spin = false;
    }, 5000);
  }

  toggleVisibility() {
    this.isShown = !this.isShown;
    if(this.isShown) {
      this.socket.emit('randomizer::showById', this.item.id, () => {});
    } else {
      this.socket.emit('randomizer::hideAll', () => {});
    }
  }

  async save() {
    this.$v.$touch();
    if (!this.$v.$invalid) {
      this.state.save = this.$state.progress;
      await new Promise((resolve) => {
        this.item.isShown = this.isShown;
        console.debug('Saving randomizer', this.item);
        this.socket.emit('randomizer::save', this.item, (err: Error | null) => {
          if (err) {
            this.state.save = this.$state.fail;
            this.$bvToast.toast(err.message, {
              title: `Error`,
              variant: 'danger',
              solid: true,
            });
            console.error(err.message)
          } else {
            this.pending = false;
            this.$router.push({ name: 'RandomizerRegistryEdit', params: { id: this.item.id } }).catch(err => {})
            this.state.save = this.$state.success;
          }
          resolve();
        });
      });
    }
    setTimeout(() => {
      this.state.save = this.$state.idle;
    }, 1000)
  }

  async created() {
    this.state.loading = this.$state.progress;
    await Promise.all([
      new Promise(async (done) => {
        if (this.$route.params.id) {
          this.socket.emit('generic::getOne', this.$route.params.id, (err: string | null, d: Required<RandomizerInterface>) => {
            if (err) {
              console.error(err);
              return;
            }
            if (Object.keys(d).length === 0) this.$router.push({ name: 'RandomizerRegistryList' })

            // workaround for missing weight after https://github.com/sogehige/sogeBot/issues/3871
            d.customizationFont.weight = d.customizationFont.weight ?? 500;

            this.item = d;
            this.isShown = d.isShown;
            this.$route.params.id = d.id;
            done()
          })
        } else {
          done();
        }
      }),
      new Promise(async (done) => {
        const { response } = await new Promise(resolve => {
          const request = new XMLHttpRequest();
          request.open('GET', '/fonts', true);

          request.onload = function() {
            if (!(this.status >= 200 && this.status < 400)) {
              console.error('Something went wrong getting font', this.status, this.response)
            }
            resolve({ response: JSON.parse(this.response)})
          }
          request.onerror = function() {
            console.error('Connection error to sogebot')
            resolve( { response: {} });
          };

          request.send();
        })
        this.fonts = response.items.map((o: { family: string }) => {
          return { text: o.family, value: o.family }
        })
        done();
      }),
      new Promise(async(done) => {
        this.psocket.emit('permissions', (err: string | null, data: Readonly<Required<PermissionsInterface>>[]) => {
        if(err) {
          return console.error(err);
        }
          this.permissions = data
          done();
        });
      })
    ])
    this.state.loading = this.$state.success;
  };
}
</script>