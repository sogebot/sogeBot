import io from 'socket.io';
import http, { Server } from 'http';
import express from 'express';

import type { IconName } from '@fortawesome/free-solid-svg-icons';
import Module from '../_interface';

export const menu: { category: string; name: string; id: string; this: Module | null }[] = [];
export const menuPublic: { name: string; id: string }[] = [];
export const widgets: { id: string; name: string; icon: string }[] = [];

export let ioServer: io.Server | null = null;
export let app: express.Application | null = null;
export let server: Server;

export const addMenu = (menuArg: typeof menu[number]) => {
  if (!menu.find(o => o.id === menuArg.id)) {
    menu.push(menuArg);
  }
};

export const addMenuPublic = (menuArg: typeof menuPublic[number]) => {
  if (!menuPublic.find(o => o.id === menuArg.id)) {
    menuPublic.push(menuArg);
  }
};

export const addWidget = (id: string, name: string, icon: IconName) => {
  widgets.push({ id: id, name: name, icon: icon });
};

export const setIOServer = (serverArg: Server) => {
  ioServer = io(serverArg);
  ioServer.sockets.setMaxListeners(200);
};

export const setApp = (_app: express.Application) => {
  app = _app;
};

export const setServer = () => {
  if (app) {
    server = http.createServer(app);
  }
};

