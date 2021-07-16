const _value: {
  is_auto: boolean;
  localization_names: {
    [lang: string]: string;
  };
}[] = [];

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