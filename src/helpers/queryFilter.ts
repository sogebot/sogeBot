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
    if (item !== null && typeof item.items === 'undefined') {
      if (i > 0) {
        output += ` ${evalOperatorMap.get(operator)} `;
      }

      if (['pr'].includes(item.comparator)) {
        output += `${item.type}.length > 0`;
      } else if (item.typeof === 'string' || item.typeof === 'service') {
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
      } else if (['is-even', 'is-odd'].includes(item.comparator)) {
        output += `${item.type} % 2 === ${item.comparator === 'is-even' ? 0 : 1}`;
      } else {
        output += `${item.type} ${evalComparatorMap.get(item.comparator)} ${item.value}`;
      }
      if (i > 0 && operator.includes('not')) {
        output += `) `; // ending ')' after 'not' operator
      }
    } else if (item !== null && item.items.length > 0) {
      if (i > 0) {
        output += `${evalOperatorMap.get(operator)?.replace('(', '')}`; // we need to replace '(' as it is already part of new group
      }

      output += '(' + itemsToEvalPart(item.items, item.operator) + ')';
    }
  }
  return output;
}