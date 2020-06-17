<template>
  <b-card no-body>
    <b-card-header header-tag="header" class="p-1" role="tab">
      <b-button block v-b-toggle.accordion-1 variant="light" class="text-left">{{translate('registry.alerts.font.setting')}}</b-button>
    </b-card-header>
    <b-collapse id="accordion-1" accordion="my-accordion" role="tabpanel">
      <b-card-body>
        <b-form-group label-cols-sm="4" label-cols-lg="3"
                      :label="translate('registry.alerts.font.name')">
          <b-form-select v-model="dataValues.family" :options="fonts" plain></b-form-select>
        </b-form-group>

        <b-form-group label-cols-sm="4" label-cols-lg="3"
                :label="translate('registry.alerts.font.size.name')"
                label-for="font.size">
          <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
            <b-form-input
              id="font.size"
              v-model="dataValues.size"
              type="range"
              min="1"
              max="200"
              step="1"
            ></b-form-input>
            <b-input-group-text slot="append" class="pr-3 pl-3">
              <div style="width: 3rem;">
                {{dataValues.size}}px
              </div>
            </b-input-group-text>
          </b-input-group>
        </b-form-group>

        <b-form-group label-cols-sm="4" label-cols-lg="3"
                :label="translate('registry.alerts.font.weight.name')"
                label-for="font.weight">
          <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
            <b-form-input
              id="font.weight"
              v-model="dataValues.weight"
              type="range"
              min="100"
              max="900"
              step="100"
            ></b-form-input>
            <b-input-group-text slot="append" class="pr-3 pl-3">
              <div style="width: 3rem;">
                {{ dataValues.weight}}
              </div>
            </b-input-group-text>
          </b-input-group>
        </b-form-group>

        <b-form-group label-cols-sm="4" label-cols-lg="3"
                :label="translate('registry.alerts.font.borderPx.name')"
                label-for="font.borderPx">
          <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
            <b-form-input
              id="font.borderPx"
              v-model="dataValues.borderPx"
              type="range"
              min="0"
              max="100"
              step="1"
            ></b-form-input>
            <b-input-group-text slot="append" class="pr-3 pl-3">
              <div style="width: 3rem;">
                {{ dataValues.borderPx}}px
              </div>
            </b-input-group-text>
          </b-input-group>
        </b-form-group>

        <b-form-group label-cols-sm="4" label-cols-lg="3"
                :label="translate('registry.alerts.font.borderColor.name')"
                label-for="font.borderColor">
          <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
            <b-form-input
              id="font.borderColor"
              v-model="dataValues.borderColor"
              type="color"
            ></b-form-input>
          </b-input-group>
        </b-form-group>

        <b-form-group label-cols-sm="4" label-cols-lg="3"
                :label="translate('registry.alerts.font.color.name')"
                label-for="font.color"
                v-if="dataValues.color">
          <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
            <b-form-input
              id="font.color"
              v-model="dataValues.color"
              type="color"
            ></b-form-input>
          </b-input-group>
        </b-form-group>

        <b-form-group label-cols-sm="4" label-cols-lg="3"
                :label="translate('registry.alerts.font.highlightcolor.name')"
                label-for="font.highlightcolor"
                v-if="dataValues.highlightcolor">
          <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
            <b-form-input
              id="font.highlightcolor"
              v-model="dataValues.highlightcolor"
              type="color"
            ></b-form-input>
          </b-input-group>
        </b-form-group>

        <b-card no-body>
          <b-tabs content-class="mt-3 mb-3" pills card>
            <template v-slot:empty>
              <div class="text-center text-muted">
                There are no shadow<br>
                Create a new shadow using the <b>+</b> button above.
              </div>
            </template>
            <template v-slot:tabs-end>
              <b-nav-item role="presentation" @click.prevent="addShadow" href="#"><b>+</b></b-nav-item>
            </template>
            <b-tab v-for="i of Object.keys(dataValues.shadow)" :key="'dyn-tab-' + i" :title="'Shadow ' + i">
              <b-form-group label-cols-sm="4" label-cols-lg="3"
                      :label="translate('dialog.font.shadowShiftRight')"
                      label-for="font.shadowShiftRight">
                <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
                  <b-form-input
                    id="font.shadowShiftRight"
                    v-model="dataValues.shadow[i].shiftRight"
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                  ></b-form-input>
                  <b-input-group-text slot="append" class="pr-3 pl-3">
                    <div style="width: 3rem;">
                      {{ dataValues.shadow[i].shiftRight}}px
                    </div>
                  </b-input-group-text>
                </b-input-group>
              </b-form-group>

              <b-form-group label-cols-sm="4" label-cols-lg="3"
                      :label="translate('dialog.font.shadowShiftDown')"
                      label-for="font.shadowShiftDown">
                <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
                  <b-form-input
                    id="font.shadowShiftDown"
                    v-model="dataValues.shadow[i].shiftDown"
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                  ></b-form-input>
                  <b-input-group-text slot="append" class="pr-3 pl-3">
                    <div style="width: 3rem;">
                      {{ dataValues.shadow[i].shiftDown}}px
                    </div>
                  </b-input-group-text>
                </b-input-group>
              </b-form-group>

              <b-form-group label-cols-sm="4" label-cols-lg="3"
                      :label="translate('dialog.font.shadowBlur')"
                      label-for="font.shadowBlur">
                <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
                  <b-form-input
                    id="font.shadowBlur"
                    v-model="dataValues.shadow[i].blur"
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                  ></b-form-input>
                  <b-input-group-text slot="append" class="pr-3 pl-3">
                    <div style="width: 3rem;">
                      {{ dataValues.shadow[i].blur}}px
                    </div>
                  </b-input-group-text>
                </b-input-group>
              </b-form-group>

              <b-form-group label-cols-sm="4" label-cols-lg="3"
                      :label="translate('dialog.font.shadowOpacity')"
                      label-for="font.shadowOpacity">
                <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
                  <b-form-input
                    id="font.shadowOpacity"
                    v-model="dataValues.shadow[i].opacity"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                  ></b-form-input>
                  <b-input-group-text slot="append" class="pr-3 pl-3">
                    <div style="width: 3rem;">
                      {{ dataValues.shadow[i].opacity}}%
                    </div>
                  </b-input-group-text>
                </b-input-group>
              </b-form-group>

              <b-form-group label-cols-sm="4" label-cols-lg="3"
                      :label="translate('dialog.font.color')"
                      label-for="font.shadowColor">
                <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
                  <b-form-input
                    id="font.shadowColor"
                    v-model="dataValues.shadow[i].color"
                    type="color"
                  ></b-form-input>
                </b-input-group>
              </b-form-group>
              <hold-button v-if="$route.params.id || null" @trigger="removeShadow(i)" icon="trash" class="btn-danger">
                <template slot="title">{{translate('dialog.buttons.delete')}}</template>
                <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
              </hold-button>
            </b-tab>
          </b-tabs>
        </b-card>

        <template v-if="typeof dataValues.color === 'undefined'">
          <b-form-input type="color" v-model="exampleColor" class="float-right border-0 p-0" style="width: 25px"/>
        </template>
        <div :style="{
          color: typeof dataValues.color === 'undefined' ? exampleColor : dataValues.color,
          'font-size': dataValues.size + 'px',
          'font-weight': dataValues.weight,
          'font-family': dataValues.family,
          'text-align': 'center',
          'text-shadow': [textStrokeGenerator(dataValues.borderPx, dataValues.borderColor), shadowGenerator(dataValues.shadow)].filter(Boolean).join(', ')
          }">
          The quick brown fox jumps over the lazy dog
        </div>
      </b-card-body>
    </b-collapse>
  </b-card>
</template>

<script lang="ts">
import { Vue, Component, PropSync, Watch } from 'vue-property-decorator';
import { textStrokeGenerator, shadowGenerator } from 'src/panel/helpers/text';

@Component({})
export default class fontCustomizer extends Vue {
  @PropSync('data') dataValues!: {
    family: string;
    size: number;
    borderPx: number;
    borderColor: string;
    shadow: {
      shiftRight: number;
      shiftDown: number;
      blur: number;
      opacity: number;
      color: string;
    }[];
    weight: number;
    color?: string;
    highlightcolor?: string;
  }

  textStrokeGenerator = textStrokeGenerator;
  shadowGenerator = shadowGenerator;

  exampleColor = '#000000';
  fonts: {text: string; value: string}[] = [];

  async mounted() {
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

    this.loadFont(this.dataValues.family)
  }

  addShadow() {
    this.dataValues.shadow.push({
      shiftRight: 1, shiftDown: 1,
      blur: 5, opacity: 100, color: "#ffffff",
    });
  }

  removeShadow(index: number) {
    this.dataValues.shadow.splice(index, 1);
  }

  @Watch('dataValues.family')
  loadFont(value: string) {
    const head = document.getElementsByTagName('head')[0];
    const style = document.createElement('style');
    style.type = 'text/css';
    console.debug('Loading font', value)
    const font = value.replace(/ /g, '+')
    const css = "@import url('https://fonts.googleapis.com/css?family=" + font + "');"
    style.appendChild(document.createTextNode(css));
    head.appendChild(style);
  }
}
</script>