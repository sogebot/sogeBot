export type Node<T = string> = {
  id: number,
  name: string,
  data: { value: T, data: string },
  class: string,
  html: string,
  inputs: { input_1: { connections: {
    node: string,
  }[] }} | Record<string, never>,
  outputs: { output_1: { connections: {
    node: string,
  }[] }, output_2: { connections: {
    node: string,
  }[] }},
};