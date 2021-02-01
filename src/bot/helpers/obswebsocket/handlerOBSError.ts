const handleOBSError = (_error: any) => {
  if (_error.code === 'NOT_CONNECTED') {
    if (process.env.BUILD === 'web') {
      console.error('OBSWEBSOCKET: Not connected to OBS Websocket.')
    } else {
      require('../log').error('OBSWEBSOCKET: Not connected to OBS Websocket.');
    }
  }
};

export { handleOBSError };