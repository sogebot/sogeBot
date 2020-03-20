import io from 'socket.io';
import http from 'http';
import express from 'express';

export const menu: { category: string; name: string; id: string }[] = [];
export const widgets: { id: string; name: string; icon: string }[] = [];

export let ioServer: io.Server | null = null;
export let app: express.Application | null = null;
export let server;

export const addMenu = (menuArg) => {
  if (!menu.find(o => o.id === menuArg.id)) {
    menu.push(menuArg);
  }
};

export const addWidget = (id, name, icon) => {
  widgets.push({ id: id, name: name, icon: icon });
};

export const setIOServer = (server) => {
  ioServer = io(server);
};

export const setApp = (_app) => {
  app = _app;
};

export const setServer = () => {
  if (app) {
    server = http.createServer(app);
  }
};

