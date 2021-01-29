const maxRetries = 3;
let curRetries = 0;

function setCurrentRetries(value: typeof curRetries) {
  curRetries = value;
}

let getCurrentStreamData = 0;
let getChannelInformation = 0;
let getChannelSubscribers = 0;
const retries = {
  set getCurrentStreamData (value: typeof getCurrentStreamData) {
    getCurrentStreamData = value;
  },
  set getChannelInformation (value: typeof getChannelInformation) {
    getChannelInformation = value;
  },
  set getChannelSubscribers (value: typeof getChannelSubscribers) {
    getChannelSubscribers = value;
  },
  get getCurrentStreamData() {
    return getCurrentStreamData;
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