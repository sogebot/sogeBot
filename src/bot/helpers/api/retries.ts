const maxRetries = 3;
let curRetries = 0;

function setCurrentRetries(value: typeof curRetries) {
  curRetries = value;
}

let getChannelInformation = 0;
let getChannelSubscribers = 0;
const retries = {
  set getChannelInformation (value: typeof getChannelInformation) {
    getChannelInformation = value;
  },
  set getChannelSubscribers (value: typeof getChannelSubscribers) {
    getChannelSubscribers = value;
  },
  get getChannelInformation() {
    return getChannelInformation;
  },
  get getChannelSubscribers() {
    return getChannelSubscribers;
  },
};

export {
  maxRetries, curRetries, setCurrentRetries, retries,
};