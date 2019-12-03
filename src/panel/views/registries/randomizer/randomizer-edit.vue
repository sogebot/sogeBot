<template>
  <b-container fluid ref="window">
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.randomizer') }}
          <template v-if="$route.params.id">
            <small><fa icon="angle-right"/></small>
            {{item.name}}
            <small class="text-muted text-monospace" style="font-size:0.7rem">{{$route.params.id}}</small>
          </template>
        </span>
      </b-col>
    </b-row>

    <panel>
      <template v-slot:left>
        <button-with-icon class="btn-secondary btn-reverse" icon="caret-left" href="#/registry/randomizer/list">{{translate('commons.back')}}</button-with-icon>
        <hold-button v-if="$route.params.id" @trigger="del()" icon="trash" class="btn-danger">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
      </template>
      <template v-slot:right>
        <b-alert show variant="info" v-if="pending" v-html="translate('dialog.changesPending')" class="mr-2 p-2 mb-0"></b-alert>
        <state-button @click="save()" text="saveChanges" class="btn-shrink" :state="state.save" :invalid="!!$v.$invalid && !!$v.$dirty"/>
      </template>
    </panel>

    <loading v-if="state.loading !== $state.success"/>
    <b-form v-else>
      <b-form-group
        :label="translate('registry.randomizer.form.name')"
        label-for="name"
      >
        <b-input-group>
          <b-form-input
            id="name"
            v-model.trim="item.name"
            type="text"
            @input="$v.item.name.$touch()"
            :state="$v.item.name.$invalid && $v.item.name.$dirty ? false : null"
          ></b-form-input>
        </b-input-group>
        <b-form-invalid-feedback :state="!($v.item.name.$invalid && $v.item.name.$dirty)">{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
      </b-form-group>
      <b-form-group>
        <b-row>
          <b-col>
            <label for="command">{{ translate('registry.randomizer.form.command') }}</label>
            <b-input-group>
              <b-form-input
                id="command"
                v-model.trim="item.command"
                type="text"
                @input="$v.item.command.$touch()"
                :state="$v.item.command.$invalid && $v.item.command.$dirty ? false : null"
              ></b-form-input>
            </b-input-group>
            <b-form-invalid-feedback :state="!($v.item.command.$invalid && $v.item.command.$dirty)">
              <template v-if="!$v.item.command.sw">
                {{ translate('errors.command_must_start_with_!') }}
              </template>
              <template v-else-if="!$v.item.command.minLength">
                {{ translate('errors.minLength_of_value_is').replace('$value', 2) }}
              </template>
              <template v-else>
                {{ translate('dialog.errors.required') }}
              </template>
            </b-form-invalid-feedback>
          </b-col>
          <b-col>
            <label for="permission_select">{{ translate('registry.randomizer.form.permission') }}</label>
            <b-input-group>
              <b-form-select v-model="item.permissionId" :state="$v.item.permissionId.$invalid && $v.item.permissionId.$dirty ? false : null" id="permission_select">
                <option v-if="!getPermissionName(item.permissionId)" :key="item.permissionId" :value="item.permissionId" disabled> --- Permission not found ---</option>
                <option v-for="p of permissions" :key="p.id" :value="p.id">{{ getPermissionName(p.id) | capitalize }}</option>
              </b-form-select>
              <b-form-invalid-feedback :state="!($v.item.permissionId.$invalid && $v.item.permissionId.$dirty)">
                {{ translate('errors.permission_must_exist') }}
              </b-form-invalid-feedback>
            </b-input-group>
          </b-col>
        </b-row>
      </b-form-group>

      <b-card :header="translate('registry.goals.fontSettings')"
      >
        <b-card-text>
          <b-form-group>
            <label for="font_selector">{{ translate('registry.goals.input.fonts.title') }}</label>
            <b-form-select v-model="item.customizationFont.family" id="font_selector">
              <option v-for="font of fonts" :value="font.text" :key="font.text">{{font.text}}</option>
            </b-form-select>
            <small class="form-text text-muted" v-html="translate('registry.goals.input.fonts.help')"></small>
          </b-form-group>

          <b-row class="py-3">
            <b-col cols="3">
              <b-form-group>
                <label for="fonts_size_input">{{ translate('registry.goals.input.fontSize.title') }}</label>
                <b-input
                  v-model.number="item.customizationFont.size"
                  type="number" :min="1" id="fonts_size_input"
                  @input="$v.item.customizationFont.size.$touch()"
                  :state="$v.item.customizationFont.size.$invalid && $v.item.customizationFont.size.$dirty ? false : null"
                />
                <small class="form-text text-muted">{{ translate('registry.goals.input.fontSize.help') }}</small>
                <b-form-invalid-feedback :state="!($v.item.customizationFont.size.$invalid && $v.item.customizationFont.size.$dirty)">
                  <template v-if="!$v.item.customizationFont.size.minValue">
                    {{ translate('errors.minValue_of_value_is').replace('$value', 1) }}
                  </template>
                  <template v-else>
                    {{ translate('dialog.errors.required') }}
                  </template>
                </b-form-invalid-feedback>
              </b-form-group>
            </b-col>

            <b-col cols="3">
              <b-form-group>
                <label for="fonts_borderPx_input">{{ translate('registry.goals.input.borderPx.title') }}</label>
                <b-input
                  v-model.number="item.customizationFont.borderPx"
                  type="number" :min="0" id="fonts_borderPx_input"
                  @input="$v.item.customizationFont.borderPx.$touch()"
                  :state="$v.item.customizationFont.borderPx.$invalid && $v.item.customizationFont.borderPx.$dirty ? false : null"
                />
                <small class="form-text text-muted">{{ translate('registry.goals.input.borderPx.help') }}</small>
                <b-form-invalid-feedback :state="!($v.item.customizationFont.borderPx.$invalid && $v.item.customizationFont.borderPx.$dirty)">
                  <template v-if="!$v.item.customizationFont.borderPx.minValue">
                    {{ translate('errors.minValue_of_value_is').replace('$value', 0) }}
                  </template>
                  <template v-else>
                    {{ translate('dialog.errors.required') }}
                  </template>
                </b-form-invalid-feedback>
              </b-form-group>
            </b-col>

            <b-col cols="6">
              <b-form-group>
                <b-row class="pl-3 pr-3">
                  <label class="w-100" for="fonts_color_input">{{ translate('registry.goals.input.color.title') }}</label>
                  <b-input
                    class="col-10"
                    v-model.trim="item.customizationFont.color"
                    type="text"
                    @input="$v.item.customizationFont.color.$touch()"
                    :state="$v.item.customizationFont.color.$invalid && $v.item.customizationFont.color.$dirty ? false : null"
                  />
                  <b-input
                    class="col-2"
                    v-model.trim="item.customizationFont.color"
                    type="color" id="fonts_color_input"
                    @input="$v.item.customizationFont.color.$touch()"
                    :state="$v.item.customizationFont.color.$invalid && $v.item.customizationFont.color.$dirty ? false : null"
                  />
                  <b-form-invalid-feedback :state="!($v.item.customizationFont.color.$invalid && $v.item.customizationFont.color.$dirty)">
                    {{ translate('errors.invalid_format') }}
                  </b-form-invalid-feedback>
                </b-row>

                <b-row class="pl-3 pr-3 pt-2">
                  <label class="w-100" for="fonts_border_color_input">{{ translate('registry.goals.input.borderColor.title') }}</label>
                  <b-input
                    class="col-10"
                    v-model.trim="item.customizationFont.borderColor"
                    type="text"
                    @input="$v.item.customizationFont.borderColor.$touch()"
                    :state="$v.item.customizationFont.borderColor.$invalid && $v.item.customizationFont.borderColor.$dirty ? false : null"
                  />
                  <b-input
                    class="col-2"
                    v-model.trim="item.customizationFont.borderColor"
                    type="color" id="fonts_border_color_input"
                    @input="$v.item.customizationFont.borderColor.$touch()"
                    :state="$v.item.customizationFont.borderColor.$invalid && $v.item.customizationFont.borderColor.$dirty ? false : null"
                  />
                  <b-form-invalid-feedback :state="!($v.item.customizationFont.borderColor.$invalid && $v.item.customizationFont.borderColor.$dirty)">
                    {{ translate('errors.invalid_format') }}
                  </b-form-invalid-feedback>
                </b-row>
              </b-form-group>
            </b-col>
          </b-row>
        </b-card-text>
      </b-card>
    </b-form>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';

import { Validations } from 'vuelidate-property-decorators';
import { required, minLength, minValue } from 'vuelidate/lib/validators';

import { getSocket } from 'src/panel/helpers/socket';
import { Randomizer } from 'src/bot/database/entity/randomizer';
import uuid from 'uuid/v4';
import { permission } from 'src/bot/helpers/permissions';

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
    loading: () => import('../../../components/loading.vue'),
  },
  filters: {
    capitalize(value) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  }
})
export default class randomizerEdit extends Vue {
  psocket: SocketIOClient.Socket = getSocket('/core/permissions');
  socket: SocketIOClient.Socket =  getSocket('/registry/randomizer');

  state: {
    loading: number; save: number;
  } = {
    loading: this.$state.idle,
    save: this.$state.idle,
  };
  pending = false;

  fonts: { text: string, value: string }[] = [];

  permissions: {id: string; name: string;}[] = [];
  item: Randomizer = {
    id: uuid(),
    name: '',
    command: '',
    items: [],
    createdAt: Date.now(),
    permissionId: permission.CASTERS,
    isShown: false,
    type: 'simple',
    customizationFont: {
      family: 'PT Sans',
      size: 16,
      color: '#ffffff',
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
        required,
        sw: (value) => value.startsWith('!'),
        minLength: minLength(2),
      },
      permissionId: {
        mustBeExisting: (value) => !!this.getPermissionName(value),
      },
      customizationFont: {
        color: {
          isColor: (value) => !!value.match(/^(#{1})([0-9A-F]{8}|[0-9A-F]{6})$/ig),
        },
        borderColor: {
          isColor: (value) => !!value.match(/^(#{1})([0-9A-F]{8}|[0-9A-F]{6})$/ig),
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

  @Watch('item', { deep: true })
  setPendingState() {
    if (this.state.loading === this.$state.success) {
      this.pending = true;
    }
  }

  beforeRouteUpdate(to, from, next) {
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

  beforeRouteLeave(to, from, next) {
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

  getPermissionName(id) {
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

  del() {
    this.socket.emit('randomizer::remove', this.item, (err) => {
      if (err) {
        console.error(err);
      } else {
        this.$router.push({ name: 'RandomizerRegistryList' });
      }
    })
  }

  save() {
    this.$v.$touch();
    if (!this.$v.$invalid) {
      this.state.save = this.$state.progress;
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
          this.socket.emit('randomizer::getOne', this.$route.params.id, (err, d: Randomizer) => {
            if (err) {
              console.error(err);
              return;
            }
            if (Object.keys(d).length === 0) this.$router.push({ name: 'RandomizerRegistryList' })
            this.item = d;
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
        this.fonts = response.items.map((o) => {
          return { text: o.family, value: o.family }
        })
        done();
      }),
      new Promise(async(done) => {
        this.psocket.emit('permissions', (data) => {
          this.permissions = data
          done();
        });
      })
    ])
    this.state.loading = this.$state.success;
  };
}
</script>

<style scoped>
</style>