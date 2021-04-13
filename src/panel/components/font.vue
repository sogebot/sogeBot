<template>
  <b-card no-body>
    <b-card-header
      header-tag="header"
      class="p-1"
      role="tab"
    >
      <b-button
        v-b-toggle="'accordion-font-' + uuid"
        block
        variant="light"
        class="text-left"
      >
        {{ translate('registry.alerts.' + (title ? title : 'font') + '.setting') }}
      </b-button>
    </b-card-header>
    <b-collapse
      :id="'accordion-font-' + uuid"
      :accordion="'accordion-font-' + uuid"
      role="tabpanel"
    >
      <b-card-body>
        <slot />

        <b-form-group
          v-if="isChild"
          label-cols-sm="4"
          label-cols-lg="3"
          :label="translate('registry.alerts.font.overrideGlobal')"
        >
          <b-form-checkbox
            :id="'font-override-' + uuid"
            :key="'font-override-' + uuid"
            v-model="isOverriden"
            :name="'font-override-' + uuid"
            switch
          />
        </b-form-group>

        <template v-if="!isChild || isChild && isOverriden">
          <b-form-group
            label-cols-sm="4"
            label-cols-lg="3"
            :label="translate('registry.alerts.font.name')"
          >
            <b-form-select
              v-model="fontData.family"
              :options="fonts"
              plain
            />
          </b-form-group>

          <b-form-group
            v-if="fontData.align"
            label-cols-sm="4"
            label-cols-lg="3"
            :label="translate('registry.alerts.font.align.name')"
            :label-for="'font.align' + uuid"
          >
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-select
                :id="'font.align' + uuid"
                v-model="fontData.align"
                class="mb-3"
              >
                <b-form-select-option value="left">
                  {{ translate('registry.alerts.font.align.left') }}
                </b-form-select-option>
                <b-form-select-option value="center">
                  {{ translate('registry.alerts.font.align.center') }}
                </b-form-select-option>
                <b-form-select-option value="right">
                  {{ translate('registry.alerts.font.align.right') }}
                </b-form-select-option>
              </b-form-select>
            </b-input-group>
          </b-form-group>

          <b-form-group
            label-cols-sm="4"
            label-cols-lg="3"
            :label="translate('registry.alerts.font.size.name')"
            :label-for="'font.size' + uuid"
          >
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                :id="'font.size' + uuid"
                v-model="fontData.size"
                type="range"
                min="1"
                max="200"
                step="1"
              />
              <b-input-group-text
                slot="append"
                class="pr-3 pl-3"
              >
                <div style="width: 3rem;">
                  {{ fontData.size }}px
                </div>
              </b-input-group-text>
            </b-input-group>
          </b-form-group>

          <b-form-group
            label-cols-sm="4"
            label-cols-lg="3"
            :label="translate('registry.alerts.font.weight.name')"
            :label-for="'font.weight' + uuid"
          >
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                :id="'font.weight' + uuid"
                v-model="fontData.weight"
                type="range"
                min="100"
                max="900"
                step="100"
              />
              <b-input-group-text
                slot="append"
                class="pr-3 pl-3"
              >
                <div style="width: 3rem;">
                  {{ fontData.weight }}
                </div>
              </b-input-group-text>
            </b-input-group>
          </b-form-group>

          <b-form-group
            label-cols-sm="4"
            label-cols-lg="3"
            :label="translate('registry.alerts.font.borderPx.name')"
            :label-for="'font.borderPx' + uuid"
          >
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                :id="'font.borderPx' + uuid"
                v-model="fontData.borderPx"
                type="range"
                min="0"
                max="100"
                step="1"
              />
              <b-input-group-text
                slot="append"
                class="pr-3 pl-3"
              >
                <div style="width: 3rem;">
                  {{ fontData.borderPx }}px
                </div>
              </b-input-group-text>
            </b-input-group>
          </b-form-group>

          <b-form-group
            label-cols-sm="4"
            label-cols-lg="3"
            :label="translate('registry.alerts.font.borderColor.name')"
            :label-for="'font.borderColor' + uuid"
          >
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                :id="'font.borderColor' + uuid"
                v-model="fontData.borderColor"
                type="color"
              />
            </b-input-group>
          </b-form-group>

          <b-form-group
            v-if="fontData.color"
            label-cols-sm="4"
            label-cols-lg="3"
            :label="translate('registry.alerts.font.color.name')"
            :label-for="'font.color' + uuid"
          >
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                :id="'font.color' + uuid"
                v-model="fontData.color"
                type="color"
              />
            </b-input-group>
          </b-form-group>

          <b-form-group
            v-if="fontData.highlightcolor"
            label-cols-sm="4"
            label-cols-lg="3"
            :label="translate('registry.alerts.font.highlightcolor.name')"
            :label-for="'font.highlightcolor' + uuid"
          >
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                :id="'font.highlightcolor' + uuid"
                v-model="fontData.highlightcolor"
                type="color"
              />
            </b-input-group>
          </b-form-group>

          <b-card no-body>
            <b-tabs
              content-class="mt-3 mb-3"
              pills
              card
            >
              <template #empty>
                <div class="text-center text-muted">
                  There are no shadow<br>
                  Create a new shadow using the <b>+</b> button above.
                </div>
              </template>
              <template #tabs-end>
                <b-nav-item
                  role="presentation"
                  href="#"
                  @click.prevent="addShadow"
                >
                  <b>+</b>
                </b-nav-item>
              </template>
              <template v-if="fontData.shadow">
                <b-tab
                  v-for="i of Object.keys(fontData.shadow)"
                  :key="'dyn-tab-' + i"
                  :title="'Shadow ' + i"
                >
                  <b-form-group
                    label-cols-sm="4"
                    label-cols-lg="3"
                    :label="translate('dialog.font.shadowShiftRight')"
                    :label-for="'font.shadowShiftRight' + uuid"
                  >
                    <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
                      <b-form-input
                        :id="'font.shadowShiftRight' + uuid"
                        v-model="fontData.shadow[i].shiftRight"
                        type="range"
                        min="-50"
                        max="50"
                        step="1"
                      />
                      <b-input-group-text
                        slot="append"
                        class="pr-3 pl-3"
                      >
                        <div style="width: 3rem;">
                          {{ fontData.shadow[i].shiftRight }}px
                        </div>
                      </b-input-group-text>
                    </b-input-group>
                  </b-form-group>

                  <b-form-group
                    label-cols-sm="4"
                    label-cols-lg="3"
                    :label="translate('dialog.font.shadowShiftDown')"
                    :label-for="'font.shadowShiftDown' + uuid"
                  >
                    <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
                      <b-form-input
                        :id="'font.shadowShiftDown' + uuid"
                        v-model="fontData.shadow[i].shiftDown"
                        type="range"
                        min="-50"
                        max="50"
                        step="1"
                      />
                      <b-input-group-text
                        slot="append"
                        class="pr-3 pl-3"
                      >
                        <div style="width: 3rem;">
                          {{ fontData.shadow[i].shiftDown }}px
                        </div>
                      </b-input-group-text>
                    </b-input-group>
                  </b-form-group>

                  <b-form-group
                    label-cols-sm="4"
                    label-cols-lg="3"
                    :label="translate('dialog.font.shadowBlur')"
                    :label-for="'font.shadowBlur' + uuid"
                  >
                    <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
                      <b-form-input
                        :id="'font.shadowBlur' + uuid"
                        v-model="fontData.shadow[i].blur"
                        type="range"
                        min="0"
                        max="50"
                        step="1"
                      />
                      <b-input-group-text
                        slot="append"
                        class="pr-3 pl-3"
                      >
                        <div style="width: 3rem;">
                          {{ fontData.shadow[i].blur }}px
                        </div>
                      </b-input-group-text>
                    </b-input-group>
                  </b-form-group>

                  <b-form-group
                    label-cols-sm="4"
                    label-cols-lg="3"
                    :label="translate('dialog.font.shadowOpacity')"
                    :label-for="'font.shadowOpacity' + uuid"
                  >
                    <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
                      <b-form-input
                        :id="'font.shadowOpacity' + uuid"
                        v-model="fontData.shadow[i].opacity"
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                      />
                      <b-input-group-text
                        slot="append"
                        class="pr-3 pl-3"
                      >
                        <div style="width: 3rem;">
                          {{ fontData.shadow[i].opacity }}%
                        </div>
                      </b-input-group-text>
                    </b-input-group>
                  </b-form-group>

                  <b-form-group
                    label-cols-sm="4"
                    label-cols-lg="3"
                    :label="translate('dialog.font.color')"
                    :label-for="'font.shadowColor' + uuid"
                  >
                    <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
                      <b-form-input
                        :id="'font.shadowColor' + uuid"
                        v-model="fontData.shadow[i].color"
                        type="color"
                      />
                    </b-input-group>
                  </b-form-group>
                  <hold-button
                    icon="trash"
                    class="btn-danger"
                    @trigger="removeShadow(i)"
                  >
                    <template slot="title">
                      {{ translate('dialog.buttons.delete') }}
                    </template>
                    <template slot="onHoldTitle">
                      {{ translate('dialog.buttons.hold-to-delete') }}
                    </template>
                  </hold-button>
                </b-tab>
              </template>
            </b-tabs>
          </b-card>

          <template v-if="typeof fontData.color === 'undefined'">
            <b-form-input
              v-model="exampleColor"
              type="color"
              class="float-right border-0 p-0"
              style="width: 25px"
            />
          </template>
          <div
            :style="{
              color: typeof fontData.color === 'undefined' ? exampleColor : fontData.color,
              'font-size': fontData.size + 'px',
              'font-weight': fontData.weight,
              'font-family': fontData.family,
              'text-align': 'center',
              'text-shadow': [textStrokeGenerator(fontData.borderPx, fontData.borderColor), shadowGenerator(fontData.shadow)].filter(Boolean).join(', ')
            }"
            class="pt-2"
          >
            The quick brown fox jumps over the lazy dog
          </div>
        </template>
      </b-card-body>
    </b-collapse>
  </b-card>
</template>

<script lang="ts">
import translate from '@sogebot/ui-helpers/translate';
import {
  defineComponent, onBeforeMount, ref, watch,
} from '@vue/composition-api';
import { cloneDeep } from 'lodash-es';
import { v4 as uuidv4 } from 'uuid';

import { shadowGenerator, textStrokeGenerator } from 'src/panel/helpers/text';

function loadFont(value: string) {
  const head = document.getElementsByTagName('head')[0];
  const style = document.createElement('style');
  style.type = 'text/css';
  console.debug('Loading font', value);
  const font = value.replace(/ /g, '+');
  const css = '@import url(\'https://fonts.googleapis.com/css?family=' + font + '\');';
  style.appendChild(document.createTextNode(css));
  head.appendChild(style);
}

interface Props {
  title?: string;
  isChild: boolean;
  parent?: {
    align: 'left' | 'center' | 'right';
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
  },
  data: {
    align: 'left' | 'center' | 'right';
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
  } | null
}
export default defineComponent({
  props: {
    parent: Object, data: Object, isChild: Boolean, title: [String, Object],
  },
  setup(props: Props, ctx) {
    const exampleColor = ref('#000000');
    const uuid = ref(uuidv4());
    const fontData = ref(props.data);
    const fonts = ref([] as {text: string; value: string}[]);
    const isOverriden = ref(props.data !== null);

    watch(fontData, (val) => {
      ctx.emit('update:data', val);
    });

    const addShadow = () => {
      fontData.value?.shadow.push({
        shiftRight: 1, shiftDown:  1,
        blur:       5, opacity:    100, color:      '#ffffff',
      });
    };

    const removeShadow = (index: number)  => {
      fontData.value?.shadow.splice(index, 1);
    };

    onBeforeMount(async () => {
      const { response } = await new Promise<{ response: Record<string, any>}>(resolve => {
        const request = new XMLHttpRequest();
        request.open('GET', '/fonts', true);

        request.onload = function() {
          if (!(this.status >= 200 && this.status < 400)) {
            console.error('Something went wrong getting font', this.status, this.response);
          }
          resolve({ response: JSON.parse(this.response) });
        };
        request.onerror = function() {
          console.error('Connection error to sogebot');
          resolve( { response: {} });
        };

        request.send();
      });
      console.log({ items: response.items });
      for (const font of response.items.map((o: { family: string }) => {
        return { text: o.family, value: o.family };
      })) {
        fonts.value.push(font);
      }
      if (fontData.value) {
        loadFont(fontData.value.family);
      }
    });

    watch(() => fontData.value?.family || '', (val) => loadFont(val));
    watch(isOverriden, (val) => {
      if (val) {
        // add default values
        console.log(props);
        if (!props.parent) {
          fontData.value = {
            align:          'center',
            family:         'PT Sans',
            size:           24,
            borderPx:       1,
            borderColor:    '#000000',
            weight:         800,
            color:          '#ffffff',
            highlightcolor: '#00ff00',
            shadow:         [] as {
              shiftRight: number;
              shiftDown: number;
              blur: number;
              opacity: number;
              color: string;
            }[],
          };
        } else {
          fontData.value = cloneDeep(props.parent as any);
        }
      } else {
        fontData.value = null;
      }
    });

    return {
      textStrokeGenerator, shadowGenerator, exampleColor, fonts, addShadow, removeShadow, translate, uuid, fontData, isOverriden,
    };
  },
});
</script>