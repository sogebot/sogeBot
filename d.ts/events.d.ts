declare namespace Events {
  type Operation = {
    id: string,
    definitions: OperationDefinitions,
    fire: Function,
  }

  type OperationDefinitions = {
    [x: string]: string | boolean
  }

  type Attributes = {
    username: string,
    [x: string]: any,
  }
}