?> To get your unique socket token, go to UI -> settings -> Bot -> Socket

!> Socket token grants you full access through socket!

## How to authorize on socket

```javascript
// Connect to socket.io
import io from 'socket.io-client';

const namespace = "/"
const token = '<your-socket-token-here>';

const socket = io(namespace, { forceNew: true, query: { token } });
```
