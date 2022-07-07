import {
  OBSWebsocket as OBSWebsocketEntity, OBSWebsocketInterface, simpleModeTask,
} from '@entity/obswebsocket';
import type OBSWebSocket from 'obs-websocket-js';
import {
  Arg, Authorized, createUnionType, Field, ID, Mutation, ObjectType, Query, Resolver,
} from 'type-graphql';
import { getRepository } from 'typeorm';

import { obs } from '../../helpers/obswebsocket/client.js';
import { listScenes } from '../../helpers/obswebsocket/scenes.js';
import { getSourcesList, getSourceTypesList } from '../../helpers/obswebsocket/sources.js';
import { ioServer } from '../../helpers/panel.js';
import {
  Recording, ReplayBuffer, Scene, SetCurrentScene,
  SetMute, SetVolume, Source, TaskLog, Type, WaitMS,
} from '../schema/obsWebsocket';

export const OBSWebsocketUnion = createUnionType({
  name:        'OBSWebsocketUnion',
  types:       () => [WaitMS, Recording, ReplayBuffer, SetCurrentScene, SetMute, SetVolume, TaskLog] as const,
  // our implementation of detecting returned object type
  resolveType: value => {
    if (value.event === 'WaitMs') {
      return WaitMS; // we can return object type class (the one with `@ObjectType()`)
    }
    if (['StartRecording', 'StopRecording', 'PauseRecording', 'ResumeRecording'].includes(value.event)) {
      return Recording; // we can return object type class (the one with `@ObjectType()`)
    }
    if (['StartReplayBuffer', 'StopReplayBuffer', 'SaveReplayBuffer'].includes(value.event)) {
      return ReplayBuffer; // we can return object type class (the one with `@ObjectType()`)
    }
    if (value.event === 'SetCurrentScene') {
      return SetCurrentScene; // we can return object type class (the one with `@ObjectType()`)
    }
    if (value.event === 'SetMute') {
      return SetMute; // we can return object type class (the one with `@ObjectType()`)
    }
    if (value.event === 'SetVolume') {
      return SetVolume; // we can return object type class (the one with `@ObjectType()`)
    }
    if (value.event === 'Log') {
      return TaskLog; // we can return object type class (the one with `@ObjectType()`)
    }
    return undefined;
  },
});

@ObjectType()
class OBSWebsocket implements OBSWebsocketInterface {
  @Field(type => ID)
    id: string;
  @Field()
    name: string;
  @Field()
    advancedMode: boolean;
  @Field()
    advancedModeCode: string;
  @Field(type => [OBSWebsocketUnion])
    simpleModeTasks: simpleModeTask[];
}

@Resolver()
export class OBSWebsocketResolver {
  @Authorized()
  @Query(returns => [OBSWebsocket])
  OBSWebsocket(@Arg('id', { nullable: true }) id: string) {
    if (id) {
      return getRepository(OBSWebsocketEntity).find({ where: { id } });
    } else {
      return getRepository(OBSWebsocketEntity).find();
    }
  }

  @Authorized()
  @Query(returns => [Scene])
  async OBSWebsocketGetScenes(): Promise<OBSWebSocket.Scene[]>  {
    const integration = (await import('../../integrations/obswebsocket')).default;
    try {
      const availableScenes = integration.accessBy === 'direct'
        ? await listScenes(obs)
        : new Promise((resolve: (value: Scene[]) => void) => {
          const resolveScenes = (scenes: Scene[]) => {
            resolve(scenes);
          };

          // we need to send on all sockets on /integrations/obswebsocket
          const sockets = ioServer?.of('/integrations/obswebsocket').sockets;
          if (sockets) {
            for (const socket of sockets.values()) {
              socket.emit('integration::obswebsocket::function', 'listScenes', resolveScenes);
            }
          }
          setTimeout(() => resolve([]), 10000);
        });
      return availableScenes;
    } catch (e: any) {
      return [];
    }
  }

  @Authorized()
  @Mutation(returns => Boolean)
  async OBSWebsocketTrigger(@Arg('tasks') tasks: string) {
    const integration = (await import('../../integrations/obswebsocket')).default;
    await integration.triggerTask(JSON.parse(tasks));
    return true;
  }

  @Authorized()
  @Query(returns => [Source])
  async OBSWebsocketGetSources() {
    const integration = (await import('../../integrations/obswebsocket')).default;
    try {
      const availableSources = integration.accessBy === 'direct'
        ? await getSourcesList(obs)
        : new Promise((resolve: (value: Source[]) => void) => {
          const resolveSources = (sources: Source[]) => {
            resolve(sources);
          };

          // we need to send on all sockets on /integrations/obswebsocket
          const sockets = ioServer?.of('/integrations/obswebsocket').sockets;
          if (sockets) {
            for (const socket of sockets.values()) {
              socket.emit('integration::obswebsocket::function', 'getSourcesList', resolveSources);
            }
          }
          setTimeout(() => resolve([]), 10000);
        });
      return availableSources;
    } catch (e: any) {
      return [];
    }
  }

  @Authorized()
  @Query(returns => [Type])
  async OBSWebsocketGetSourceTypes() {
    const integration = (await import('../../integrations/obswebsocket')).default;
    try {
      const availableTypes = integration.accessBy === 'direct'
        ? await getSourceTypesList(obs)
        : new Promise((resolve: (value: Type[]) => void) => {
          const resolveTypes = (type: Type[]) => {
            resolve(type);
          };

          // we need to send on all sockets on /integrations/obswebsocket
          const sockets = ioServer?.of('/integrations/obswebsocket').sockets;
          if (sockets) {
            for (const socket of sockets.values()) {
              socket.emit('integration::obswebsocket::function', 'getTypesList', resolveTypes);
            }
          }
          setTimeout(() => resolve([]), 10000);
        });
      return availableTypes;
    } catch (e: any) {
      return [];
    }
  }

  @Authorized()
  @Mutation(returns => OBSWebsocket)
  OBSWebsocketSave(
    @Arg('data') data: string,
  ): Promise<OBSWebsocketInterface> {
    return getRepository(OBSWebsocketEntity).save(JSON.parse(data));
  }

  @Authorized()
  @Mutation(returns => Boolean)
  async OBSWebsocketRemove(@Arg('id') id: string) {
    await getRepository(OBSWebsocketEntity).delete(id);
    return true;
  }
}