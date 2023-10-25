import { constants } from 'crypto';
import fs from 'fs';
import http, { Server } from 'http';
import https from 'https';
import { normalize } from 'path';

import express from 'express';
import { Server as io } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';

import type { Module } from '../_interface.js';

import type { ClientToServerEventsWithNamespace } from '~/../d.ts/src/helpers/socket.js';
import { info } from '~/helpers/log.js';

export type MenuItem = {
  id: string;
  category?: string;
  name: string;
};

export const menu: (MenuItem & { this: Module | null })[] = [];
export const menuPublic: { name: string; id: string }[] = [];

menu.push({
  category: 'main', name: 'dashboard', id: '', this: null,
});

export let ioServer: io | null = null;
export let app: express.Application | null = null;
export let server: Server;
export let serverSecure: Server;

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

export const setApp = (_app: express.Application) => {
  app = _app;
};

export const setServer = () => {
  if (app) {
    server = http.createServer(app);
    if (process.env.CORS) {
      ioServer = new io<DefaultEventsMap, ClientToServerEventsWithNamespace>(server, {
        cors: {
          origin:  process.env.CORS,
          methods: ['GET', 'POST'],
        },
      });
    } else {
      ioServer = new io(server);
    }
    ioServer.sockets.setMaxListeners(200);

    if (process.env.CA_CERT && process.env.CA_KEY && process.env.NODE_EXTRA_CA_CERTS) {
      info(`Using ${process.env.CA_CERT} certificate for HTTPS with ${process.env.NODE_EXTRA_CA_CERTS} CA Bundle`);
      serverSecure = https.createServer({
        key:           fs.readFileSync(normalize(process.env.CA_KEY)),
        cert:          fs.readFileSync(normalize(process.env.CA_CERT)),
        ca:            fs.readFileSync(normalize(process.env.NODE_EXTRA_CA_CERTS)),
        secureOptions: constants.SSL_OP_NO_TLSv1 | constants.SSL_OP_NO_TLSv1_1,
      }, app);
      if (ioServer) {
        ioServer.attach(serverSecure);
      }
    } else if (process.env.CA_CERT && process.env.CA_KEY) {
      info(`Using ${process.env.CA_CERT} certificate for HTTPS`);
      serverSecure = https.createServer({
        key:           fs.readFileSync(normalize(process.env.CA_KEY)),
        cert:          fs.readFileSync(normalize(process.env.CA_CERT)),
        secureOptions: constants.SSL_OP_NO_TLSv1 | constants.SSL_OP_NO_TLSv1_1,
      }, app);
      if (ioServer) {
        ioServer.attach(serverSecure);
      }
    } else {
      info(`No certificates were provided, serving only HTTP.`);
    }
  }
};
