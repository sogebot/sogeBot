import type OBSWebSocket from 'obs-websocket-js';

import { handleOBSError } from './handlerOBSError';

type Source = {
  name: string,
  type: string,
  typeId: string,
};

const getSourcesList = (obs: OBSWebSocket) => {
  return new Promise((resolve: (value: Source[]) => void) => {
    obs.send('GetSourcesList').then((value) => {
      resolve(value.sources as unknown as Source[]);
    }).catch((e) => {
      handleOBSError(e);
      resolve([]);
    });
  });
};

type Type = {
  caps: {
    canInteract: boolean,
    doNotDuplicate: boolean,
    doNotSelfMonitor: boolean,
    hasAudio: boolean,
    hasVideo: boolean,
    isAsync: boolean,
    isComposite: boolean,
    isDeprecated: boolean,
  },
  displayName: string,
  type: string,
  typeId: string,
};

const getSourceTypesList = (obs: OBSWebSocket) => {
  return new Promise((resolve: (value: Type[]) => void) => {
    obs.send('GetSourceTypesList').then((value) => {
      resolve(value.types as unknown as Type[]);
    }).catch((e) => {
      handleOBSError(e);
      resolve([]);
    });
  });
};

export {
  getSourcesList, getSourceTypesList, Type, Source,
};