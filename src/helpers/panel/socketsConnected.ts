let socketsConnected = 0;

function socketsConnectedDec() {
  socketsConnected--;
}

function socketsConnectedInc() {
  socketsConnected++;
}

export {
  socketsConnected, socketsConnectedInc, socketsConnectedDec, 
};