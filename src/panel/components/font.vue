<template>
  <b-card no-body>
    <b-card-header header-tag="header" class="p-1" role="tab">
      <b-button block v-b-toggle.accordion-1 variant="light" class="text-left">{{translate('registry.alerts.font.setting')}}</b-button>
    </b-card-header>
    <b-collapse id="accordion-1" accordion="my-accordion" role="tabpanel">
      <b-card-body>
        <b-form-group label-cols-sm="4" label-cols-lg="3"
                      :label="translate('registry.alerts.font.name')">
          <b-form-select v-model="data.family" :options="fonts" plain></b-form-select>
        </b-form-group>

        <b-form-group label-cols-sm="4" label-cols-lg="3"
                :label="translate('registry.alerts.font.size.name')"
                label-for="font.size">
          <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
            <b-form-input
              id="font.size"
              v-model="data.size"
              type="range"
              min="1"
              max="200"
              step="1"
            ></b-form-input>
            <b-input-group-text slot="append" class="pr-3 pl-3">
              <div style="width: 3rem;">
                {{data.size}}px
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
              v-model="data.weight"
              type="range"
              min="100"
              max="900"
              step="100"
            ></b-form-input>
            <b-input-group-text slot="append" class="pr-3 pl-3">
              <div style="width: 3rem;">
                {{ data.weight}}
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
              v-model="data.borderPx"
              type="range"
              min="0"
              max="100"
              step="1"
            ></b-form-input>
            <b-input-group-text slot="append" class="pr-3 pl-3">
              <div style="width: 3rem;">
                {{ data.borderPx}}px
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
              v-model="data.borderColor"
              type="color"
            ></b-form-input>
          </b-input-group>
        </b-form-group>

        <b-form-group label-cols-sm="4" label-cols-lg="3"
                :label="translate('registry.alerts.font.color.name')"
                label-for="font.color"
                v-if="data.color">
          <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
            <b-form-input
              id="font.color"
              v-model="data.color"
              type="color"
            ></b-form-input>
          </b-input-group>
        </b-form-group>

        <b-form-group label-cols-sm="4" label-cols-lg="3"
                :label="translate('registry.alerts.font.highlightcolor.name')"
                label-for="font.highlightcolor"
                v-if="data.highlightcolor">
          <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
            <b-form-input
              id="font.highlightcolor"
              v-model="data.highlightcolor"
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
            <b-tab v-for="i of Object.keys(data.shadow)" :key="'dyn-tab-' + i" :title="'Shadow ' + i">
              <b-form-group label-cols-sm="4" label-cols-lg="3"
                      :label="translate('dialog.font.shadowShiftRight')"
                      label-for="font.shadowShiftRight">
                <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
                  <b-form-input
                    id="font.shadowShiftRight"
                    v-model="data.shadow[i].shiftRight"
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                  ></b-form-input>
                  <b-input-group-text slot="append" class="pr-3 pl-3">
                    <div style="width: 3rem;">
                      {{ data.shadow[i].shiftRight}}px
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
                    v-model="data.shadow[i].shiftDown"
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                  ></b-form-input>
                  <b-input-group-text slot="append" class="pr-3 pl-3">
                    <div style="width: 3rem;">
                      {{ data.shadow[i].shiftDown}}px
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
                    v-model="data.shadow[i].blur"
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                  ></b-form-input>
                  <b-input-group-text slot="append" class="pr-3 pl-3">
                    <div style="width: 3rem;">
                      {{ data.shadow[i].blur}}px
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
                    v-model="data.shadow[i].opacity"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                  ></b-form-input>
                  <b-input-group-text slot="append" class="pr-3 pl-3">
                    <div style="width: 3rem;">
                      {{ data.shadow[i].opacity}}%
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
                    v-model="data.shadow[i].color"
                    type="color"
                  ></b-form-input>
                </b-input-group>
              </b-form-group>
              <hold-button @trigger="removeShadow(i)" icon="trash" class="btn-danger">
                <template slot="title">{{translate('dialog.buttons.delete')}}</template>
                <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
              </hold-button>
            </b-tab>
          </b-tabs>
        </b-card>

        <template v-if="typeof data.color === 'undefined'">
          <b-form-input type="color" v-model="exampleColor" class="float-right border-0 p-0" style="width: 25px"/>
        </template>
        <div :style="{
          color: typeof data.color === 'undefined' ? exampleColor : data.color,
          'font-size': data.size + 'px',
          'font-weight': data.weight,
          'font-family': data.family,
          'text-align': 'center',
          'text-shadow': [textStrokeGenerator(data.borderPx, data.borderColor), shadowGenerator(data.shadow)].filter(Boolean).join(', ')
          }"
          class="pt-2">
          The quick brown fox jumps over the lazy dog
        </div>
      </b-card-body>
    </b-collapse>
  </b-card>
</template>

<script lang="ts">
import { defineComponent, ref, onBeforeMount, watch } from '@vue/composition-api'
import { textStrokeGenerator, shadowGenerator } from 'src/panel/helpers/text';

function loadFont(value: string) {
  const head = document.getElementsByTagName('head')[0];
  const style = document.createElement('style');
  style.type = 'text/css';
  console.debug('Loading font', value)
  const font = value.replace(/ /g, '+')
  const css = "@import url('https://fonts.googleapis.com/css?family=" + font + "');"
  style.appendChild(document.createTextNode(css));
  head.appendChild(style);
}

interface Props {
  data: {
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
}
export default defineComponent({
  props: {
    data: Object,
  },
  setup(props: Props) {
    const exampleColor = ref('#000000');
    const fonts = ref([] as {text: string; value: string}[]);

    const addShadow = () => {
      props.data.shadow.push({
        shiftRight: 1, shiftDown: 1,
        blur: 5, opacity: 100, color: "#ffffff",
      });
    }

    const removeShadow = (index: number)  => {
      props.data.shadow.splice(index, 1);
    }

    onBeforeMount(async () => {
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
      console.log({items: response.items});
      for (const font of response.items.map((o: { family: string }) => {
        return { text: o.family, value: o.family }
      })) {
        fonts.value.push(font);
      }
      loadFont(props.data.family)
    })

    watch(() => props.data.family, (val) => loadFont(val))

    return {
      textStrokeGenerator, shadowGenerator, exampleColor, fonts, addShadow, removeShadow
    }
  }
});
</script>