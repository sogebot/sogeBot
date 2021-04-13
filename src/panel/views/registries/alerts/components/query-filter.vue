<template>
  <b-form-group class="m-0">
    <b-input-group v-if="!noInput">
      <template #prepend>
        <b-button
          :pressed="editationMode"
          @click="editationMode = !editationMode"
        >
          <fa
            icon="cog"
            fixed-width
          />
        </b-button>
      </template>
      <b-form-textarea
        v-model="stringifiedFilter"
        readonly
      />
    </b-input-group>

    <template v-if="editationMode">
      <b-card
        no-body
        class="mt-1 p-2"
      >
        <b-card-text>
          <b-row
            class="align-items-end"
            no-gutters
          >
            <b-col
              cols="auto"
              class="pr-2"
            >
              <label-inside>{{ translate('registry.alerts.filter.operator') }}</label-inside>
              <b-select v-model="_filter.operator">
                <b-select-option value="and">
                  and
                </b-select-option>
                <b-select-option value="or">
                  or
                </b-select-option>
                <b-select-option value="and not">
                  and not
                </b-select-option>
                <b-select-option value="or not">
                  or not
                </b-select-option>
              </b-select>
            </b-col>
            <b-col cols="auto">
              <label-inside>{{ translate('registry.alerts.filter.rule') }}</label-inside>
              <b-select
                v-model="addRuleType[0]"
                class="w-auto"
              >
                <b-select-option
                  v-for="rule of rules"
                  :key="rule[0]"
                  :value="rule[0]"
                >
                  {{ rule[0] }}
                </b-select-option>
              </b-select>
              <b-button
                @click="_filter.items.push({
                  type: addRuleType[0],
                  typeof: getRuleType(addRuleType[0]),
                  comparator: 'eq',
                  value: getRuleDefaultValue(addRuleType[0]),
                })"
              >
                {{ translate('registry.alerts.filter.addRule') }}
              </b-button>
              <b-button @click="_filter.items.push(null)">
                {{ translate('registry.alerts.filter.addGroup') }}
              </b-button>
            </b-col>
            <b-col
              v-if="deletable"
              cols="auto"
              class="align-self-end"
            >
              <b-button
                variant="outline-danger"
                class="border-0"
                @click="deleteGroup"
              >
                <fa
                  icon="trash"
                  fixed-width
                />
              </b-button>
            </b-col>
          </b-row>

          <b-card
            v-if="_filter.items.length > 0"
            no-body
            class="p-2"
          >
            <template v-for="(item, index) in _filter.items">
              <b-card-text
                v-if="item !== null && typeof item.items === 'undefined'"
                :key="'item' + index"
                class="p-0"
              >
                <b-row
                  class="align-items-end"
                  no-gutters
                >
                  <b-col>
                    <b-form-group class="m-0">
                      <b-row
                        class="align-items-end"
                        no-gutters
                      >
                        <b-col style="position: relative; top: -7px;">
                          {{ item.type }}
                        </b-col>
                        <b-col
                          cols="4"
                          class="pr-2"
                        >
                          <label-inside>{{ translate('registry.alerts.filter.comparator') }}</label-inside>
                          <b-select v-model="item.comparator">
                            <b-select-option
                              v-if="getRuleType(item.type) === 'number'"
                              value="is-even"
                            >
                              {{ translate('registry.alerts.filter.isEven') }}
                            </b-select-option>
                            <b-select-option
                              v-if="getRuleType(item.type) === 'number'"
                              value="is-odd"
                            >
                              {{ translate('registry.alerts.filter.isOdd') }}
                            </b-select-option>
                            <b-select-option
                              v-if="getRuleType(item.type) !== 'string'"
                              value="lt"
                            >
                              {{ translate('registry.alerts.filter.lessThan') }}
                            </b-select-option>
                            <b-select-option
                              v-if="getRuleType(item.type) !== 'string'"
                              value="lt-eq"
                            >
                              {{ translate('registry.alerts.filter.lessThanOrEqual') }}
                            </b-select-option>
                            <b-select-option
                              v-if="getRuleType(item.type) === 'string'"
                              value="co"
                            >
                              {{ translate('registry.alerts.filter.contain') }}
                            </b-select-option>
                            <b-select-option value="eq">
                              {{ translate('registry.alerts.filter.equal') }}
                            </b-select-option>
                            <b-select-option value="neq">
                              {{ translate('registry.alerts.filter.notEqual') }}
                            </b-select-option>
                            <b-select-option value="pr">
                              {{ translate('registry.alerts.filter.present') }}
                            </b-select-option>
                            <b-select-option
                              v-if="getRuleType(item.type) === 'string'"
                              value="includes"
                            >
                              {{ translate('registry.alerts.filter.includes') }}
                            </b-select-option>
                            <b-select-option
                              v-if="getRuleType(item.type) !== 'string'"
                              value="gt"
                            >
                              {{ translate('registry.alerts.filter.greaterThan') }}
                            </b-select-option>
                            <b-select-option
                              v-if="getRuleType(item.type) !== 'string'"
                              value="gt-eq"
                            >
                              {{ translate('registry.alerts.filter.greaterThanOrEqual') }}
                            </b-select-option>
                          </b-select>
                        </b-col>
                        <b-col class="pr-2">
                          <template v-if="!['is-even', 'is-odd', 'pr'].includes(item.comparator)">
                            <label-inside>{{ translate('registry.alerts.filter.value') }}</label-inside>
                            <b-select
                              v-if="getRuleType(item.type) === 'tier'"
                              v-model="item.value"
                            >
                              <b-select-option value="Prime">
                                Prime
                              </b-select-option>
                              <b-select-option value="1">
                                1
                              </b-select-option>
                              <b-select-option value="2">
                                2
                              </b-select-option>
                              <b-select-option value="3">
                                3
                              </b-select-option>
                            </b-select>
                            <b-form-input
                              v-else-if="getRuleType(item.type) === 'number'"
                              v-model.number="item.value"
                              type="number"
                            />
                            <b-form-input
                              v-else-if="item.comparator === 'includes'"
                              v-model="item.value"
                              v-b-tooltip.hover.noninteractive
                              :title="translate('registry.alerts.filter.valueSplitByComma')"
                            />
                            <b-form-input
                              v-else
                              v-model="item.value"
                            />
                          </template>
                        </b-col>
                        <b-col
                          cols="auto"
                          class="align-self-end"
                        >
                          <b-button
                            variant="outline-danger"
                            class="border-0"
                            @click="deleteItem(index)"
                          >
                            <fa
                              icon="trash"
                              fixed-width
                            />
                          </b-button>
                        </b-col>
                      </b-row>
                    </b-form-group>
                  </b-col>
                </b-row>
              </b-card-text>
              <b-card-text
                v-else
                :key="'item' + index"
              >
                <query-filter
                  :filter.sync="_filter.items[index]"
                  :rules="rules"
                  no-input
                  deletable
                  @delete="deleteItem(index, true)"
                />
              </b-card-text>
            </template>
          </b-card>
        </b-card-text>
      </b-card>
    </template>
  </b-form-group>
</template>

<script lang="ts">
import translate from '@sogebot/ui-helpers/translate';
import {
  computed, defineComponent, ref, watch,
} from '@vue/composition-api';

import type { CommonSettingsInterface } from 'src/bot/database/entity/alert';

const evalComparatorMap = new Map(Object.entries({
  lt:      '<',
  'lt-eq': '<=',
  eq:      '==',
  neq:     '!=',
  gt:      '>',
  'gt-eq': '>=',
}));
const evalOperatorMap = new Map(Object.entries({
  and:       '&&',
  'and not': '&& !(',
  or:        '||',
  'or not':  '|| !(',
}));

export function itemsToEvalPart (items: any[], operator: string): string {
  let output = '';
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item !== null && typeof item.items === 'undefined') {
      if (i > 0) {
        output += ` ${evalOperatorMap.get(operator)} `;
      }

      if (['pr'].includes(item.comparator)) {
        output += `${item.type}.length > 0`;
      } else if (item.typeof === 'string') {
        if (['includes'].includes(item.comparator)) {
          output += `[${item.value.split(',').map((o: string) => `'${o.trim()}'`).join(', ')}].includes(${item.type})`;
        } else if (['co'].includes(item.comparator)) {
          output += `${item.type}.includes('${item.value}')`;
        } else {
          output += `${item.type} ${evalComparatorMap.get(item.comparator)} '${item.value}'`;
        }
      } else if (item.typeof === 'tier') {
        // we need to set Prime as value 0
        const value = item.value === 'Prime' ? 0 : item.value;
        output += `${item.type} ${evalComparatorMap.get(item.comparator)} ${value}`;
      } else {
        if (['is-even', 'is-odd'].includes(item.comparator)) {
          output += `${item.type} % 2 === ${item.comparator === 'is-even' ? 0 : 1}`;
        } else {
          output += `${item.type} ${evalComparatorMap.get(item.comparator)} ${item.value}`;
        }
      }
      if (i > 0 && operator.includes('not')) {
        output += `) `; // ending ')' after 'not' operator
      }
    } else {
      if (item !== null && item.items.length > 0) {
        if (i > 0) {
          output += `${evalOperatorMap.get(operator)?.replace('(', '')}`; // we need to replace '(' as it is already part of new group
        }

        output +=  '(' + itemsToEvalPart(item.items, item.operator) + ')';
      }
    }
  }
  return output;
}

type Props = {
  filter: CommonSettingsInterface['filter'],
  noInput: boolean,
  deletable: boolean,
  rules: [[string, string]]
};
export default defineComponent({
  name:       'QueryFilter',
  components: { 'label-inside': () => import('src/panel/components/label-inside.vue') },
  props:      {
    filter:    Object,
    rules:     Array,
    noInput:   Boolean,
    deletable: Boolean,
  },
  setup(props: Props, ctx) {
    const _filter = ref((props.filter !== null ? props.filter : {
      operator: 'and',
      items:    [],
    }) as CommonSettingsInterface['filter']);
    const editationMode = ref(props.noInput);
    const addRuleType = ref([props.rules[0][0]]);

    const getRuleDefaultValue = (type: string) => {
      switch(getRuleType(type)) {
        case 'string':
          return '';
        case 'number':
          return 0;
        case 'tier':
          return 'Prime';
      }
    };

    const getRuleType = (type: string) => {
      const rule = props.rules.find(o => o[0] === type);
      if (!rule) {
        return 'string';
      } else {
        return rule[1];
      }
    };

    const itemsToStringifiedPart = (items: any[], operator: string): string => {
      let output = '';
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item !== null && typeof item.items === 'undefined') {
          if (i > 0) {
            output += ` ${operator} `;
          }

          if (item.typeof === 'string') {
            if (['pr'].includes(item.comparator)) {
              output += `${item.type} ${item.comparator}`;
            } else if (['includes'].includes(item.comparator)) {
              output += `${item.type} ${item.comparator} [${item.value.split(',').map((o: string) => `'${o.trim()}'`).join(', ')}]`;
            } else {
              output += `${item.type} ${item.comparator} '${item.value}'`;
            }
          } else if (item.typeof === 'tier') {
            const value = item.value === 'Prime' ? 'Prime' : item.value;
            output += `${item.type} ${item.comparator} ${value}`;
          } else {
            if (['is-even', 'is-odd', 'pr'].includes(item.comparator)) {
              output += `${item.type} ${item.comparator}`;
            } else {
              output += `${item.type} ${item.comparator} ${item.value}`;
            }

          }
        } else {
          if (item !== null && item.items.length > 0) {
            if (i > 0) {
              output += ` ${operator} `;
            }

            output +=  '(' + itemsToStringifiedPart(item.items, item.operator) + ')';
          }
        }
      }
      return output;
    };

    const stringifiedFilter = computed(() => {
      if (_filter.value) {
        const filter = itemsToStringifiedPart(_filter.value.items, _filter.value.operator);
        return filter.length > 0 ? filter : `<< ${translate('registry.alerts.filter.noFilter')} >>`;
      }
      return `<< ${translate('registry.alerts.filter.noFilter')} >>`;
    });

    const deleteItem = (index: number, skipConfirm = false) => {
      if (_filter.value) {
        const item = _filter.value.items[index];
        if (typeof item !== 'undefined' && (skipConfirm || confirm('Do you want to permanently delete this rule?'))) {
          _filter.value.items.splice(index, 1);
        }
      }
    };

    const deleteGroup = () => {
      if (confirm('Do you want to permanently delete this group?')) {
        ctx.emit('delete'); // parent need to remove this
      }
    };

    watch(_filter, (val) => {
      ctx.emit('update:filter', val);
    }, { deep: true });

    return {
      _filter,
      editationMode,
      addRuleType,
      getRuleType,
      getRuleDefaultValue,
      stringifiedFilter,
      deleteItem,
      deleteGroup,
      translate,
    };
  },
});
</script>