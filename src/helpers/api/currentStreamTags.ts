const _value: string[] = [];

const currentStreamTags = {
  get value() {
    return _value;
  },
  pop() {
    _value.pop();
  },
  push(value: typeof _value[number]) {
    _value.push(value);
  },
  get length() {
    return _value.length;
  },
};

export { currentStreamTags };