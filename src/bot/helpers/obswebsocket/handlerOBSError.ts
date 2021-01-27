const handleOBSError = (error: any) => {
  if (error.code === 'NOT_CONNECTED') {
    error('OBSWEBSOCKET: Not connected to OBS Websocket.');
  }
};

export { handleOBSError };