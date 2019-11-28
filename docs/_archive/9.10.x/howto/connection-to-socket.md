?> To get your unique socket token, go to UI -> settings -> Bot -> Socket

!> Socket token grants you full access through socket!

## How to authorize on socket

```javascript
// Connect to socket.io
import io from 'socket.io-client';

const namespace = "/"
const socketToken = '<your-socket-token-here>';

const socket = io(namespace, { forceNew: true });

// send correct token
socket.on('authorize', (cb) => {
  cb({socketToken})
});

socket.on('authorized', (cb) => {
  console.debug('AUTHORIZED ACCESS: ' + namespace);
});

socket.on('unauthorized', (cb) => {
  console.debug('UNAUTHORIZED ACCESS: ' + namespace);
});

```