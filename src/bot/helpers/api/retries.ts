const maxRetries = 3;
let curRetries = 0;

function setCurrentRetries(value: typeof curRetries) {
  curRetries = value;
}

export { maxRetries, curRetries, setCurrentRetries };