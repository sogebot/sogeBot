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
      </b-card-body>
    </b-collapse>
  </b-card>
</template>

<script lang="ts">
import { Vue, Component, PropSync } from 'vue-property-decorator';


@Component({})
export default class baffleText extends Vue {
  @PropSync('data') dataValues!: {
    family: string;
    size: number;
    borderPx: number;
    borderColor: string;
    weight: number;
    color?: string;
    highlightcolor?: string;
  }

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
  }
}
</script>