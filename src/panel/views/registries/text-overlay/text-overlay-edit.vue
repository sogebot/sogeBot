<template>
  <b-container fluid ref="window">
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.textoverlay') }}
          <template v-if="state.loaded && $route.params.id">
            <small><fa icon="angle-right"/></small>
            {{name}}
            <small class="text-muted text-monospace" style="font-size:0.7rem">{{$route.params.id}}</small>
          </template>
        </span>
      </b-col>
    </b-row>

    <panel>
      <template v-slot:left>
        <button-with-icon class="btn-secondary btn-reverse" icon="caret-left" href="#/registry/textoverlay/list">{{translate('commons.back')}}</button-with-icon>
        <hold-button v-if="$route.params.id" icon="trash" class="btn-danger" @trigger="remove()">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
      </template>
      <template v-slot:right>
        <b-alert show variant="info" v-if="pending" v-html="translate('dialog.changesPending')" class="mr-2 p-2 mb-0"></b-alert>
        <b-alert show variant="danger" v-if="error" v-html="error" class="mr-2 p-2 mb-0"></b-alert>
        <state-button @click="save()" text="saveChanges" :state="state.save" :invalid="!!$v.$error"/>
      </template>
    </panel>

    <loading v-if="!state.loaded" />
    <template v-else>
      <div class="pt-3">
        <!-- Editation stuff here -->
        <form>
          <div class="form-row pl-2 pr-2">
            <b-form-group
              class="w-100"
              :label="translate('name')"
              label-for="name"
            >
              <b-form-input
                id="name"
                v-model="name"
                type="text"
                :placeholder="translate('registry.textoverlay.name.placeholder')"
                :state="$v.name.$invalid && $v.name.$dirty ? false : null"
                @input="$v.name.$touch()"
              ></b-form-input>
              <b-form-invalid-feedback :state="!($v.name.$invalid && $v.name.$dirty)">{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
            </b-form-group>
          </div>
          <div class="form-row pl-2 pr-2">
            <div class="form-group col">
              <label style="font-weight: bold; margin: 0px 0px 3px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">EXTERNAL JS</label>

              <div class="input-group mb-3">
                <input type="text" class="form-control" placeholder="e.g. https://code.jquery.com/jquery-3.3.1.min.js" v-model="externalJsInput">
                <div class="input-group-append">
                  <button type="button" class="btn btn-primary" @click="if (externalJsInput) { external.push(externalJsInput); pending = true; } externalJsInput = ''"><fa icon="plus"></fa> Add external JS</button>
                </div>
              </div>
              <ul class="list-group">
                <li style="padding: 0.1rem 0.5rem" class="list-group-item list-group-item-info d-flex justify-content-between align-items-center" v-for="js of external" :key="js" >
                  {{js}}
                  <button type="button" class="btn btn-outline-info border-0" @click="removeExternalJS(js); pending = true"><fa icon="times"></fa></button>
                </li>
              </ul>
            </div>
          </div>
          <div class="form-row pl-2 pr-2">
            <div class="form-group col">
              <label style="font-weight: bold; margin: 0px 0px 3px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">HTML</label>
              <codemirror
                class="border"
                style="font-size: 12px;"
                v-model="html"
                :options="htmlOptions"/>
            </div>
          </div>
          <div class="form-row pl-2 pr-2">
            <div class="form-group col">
              <label style="font-weight: bold; margin: 0px 0px 3px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">JS</label>
              <codemirror
                class="border"
                style="font-size: 12px;"
                v-model="js"
                :options="jsOptions"/>
            </div>
          </div>
          <div class="form-row pl-2 pr-2">
            <div class="form-group col">
              <label style="font-weight: bold; margin: 0px 0px 3px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">CSS</label>
              <codemirror
                class="border"
                style="font-size: 12px;"
                v-model="css"
                :options="cssOptions"/>
            </div>
          </div>
        </form>
      </div>
    </template>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';

import { codemirror } from 'vue-codemirror';
import 'codemirror/lib/codemirror.css';

import { Validate } from 'vuelidate-property-decorators';
import { required } from 'vuelidate/lib/validators'

import { v4 as uuid } from 'uuid';

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
    codemirror,
  },
  filters: {
    capitalize(value) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  }
})
export default class textOverlayEdit extends Vue {
  error: any = null;
  pending: boolean = false;

  id: string = uuid();
  @Validate({ required })
  name: string = '';
  html: string = '<!-- you can also use html here, global filters and custom variables are also available -->\n\n';
  js: string =  'function onLoad() { // triggered on page load\n\n}\n\nfunction onChange() { // triggered on variable change\n\n}';
  css: string =  '';
  external: string[] = [];

  @Watch('name')
  @Watch('html')
  @Watch('js')
  @Watch('css')
  @Watch('external')
  setPending() {
    this.pending = true;
  }

  htmlOptions = {
    mode:  "htmlmixed",
    lineNumbers: true,
    matchBrackets: true,
    lint: {
      esversion: 6
    },
    gutters: ["CodeMirror-lint-markers"]
  }
  jsOptions = {
    mode:  "javascript",
    lineNumbers: true,
    matchBrackets: true,
    lint: {
      esversion: 6
    },
    gutters: ["CodeMirror-lint-markers"]
  }
  cssOptions = {
    mode:  "css",
    lineNumbers: true,
    matchBrackets: true,
    lint: {
      esversion: 6
    },
    gutters: ["CodeMirror-lint-markers"]
  }
  externalJsInput: string = '';

  socket = getSocket('/registries/text');

  state: {
    loaded: boolean,
    save: number,
  } = {
    loaded: false,
    save: 0,
  };

  removeExternalJS(js) {
    this.external.splice(this.external.indexOf(js), 1)
  }

  created() {
    // load up from db
    if (this.$route.params.id) {
      this.id = this.$route.params.id
      this.socket.emit('text::getOne', this.$route.params.id, false, (err, data) => {
        if (err) {
          return console.error(err);
        }
        this.name = data.name
        this.html = data.text
        this.js = data.js
        this.css = data.css
        this.external = data.external || []
        this.$nextTick(() => { this.pending = false })
        this.state.loaded = true
      })
    } else this.state.loaded = true
  }

  async remove () {
    await new Promise(resolve => {
      this.socket.emit('text::remove', {
        id: this.id,
        name: this.name,
        text: this.html,
        js: this.js,
        css: this.css,
        external: this.external
      }, (err) => {
        if (err) {
          return console.error(err);
        }
        resolve();
      })
    })
    this.$router.push({ name: 'TextOverlayList' });
  }

  save() {
    this.$v.$touch();
    if (!this.$v.$invalid) {
      this.state.save = 1;
      const data = {
        id: this.id,
        name: this.name,
        text: this.html,
        js: this.js,
        css: this.css,
        external: this.external
      }
      this.socket.emit('text::save', data, (err, data) => {
        if (err) {
          console.error(err)
          return this.state.save = 3
        }
        this.state.save = 2
        this.pending = false
        this.$router.push({ name: 'TextOverlayEdit', params: { id: this.id } });
        setTimeout(() => this.state.save = 0, 1000)
      });
    } else {
      setTimeout(() => {
        this.state.save = 0;
      }, 1000)
    }
  }
}
</script>