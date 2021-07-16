const handleOBSError = (_error: any) => {
  let errorMsg = 'Unknown error: ' + JSON.stringify(_error);
  if (_error.code === 'NOT_CONNECTED') {
    errorMsg = 'OBSWEBSOCKET: Not connected to OBS Websocket.';
  }

  if (process.env.BUILD === 'web') {
    console.error(errorMsg);
  } else {
    require('../log').error(errorMsg);
  }
};

export { handleOBSError };