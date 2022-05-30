/* eslint-disable import/no-relative-packages */
import React from 'react';
import { Peer, util } from './peer';
import Console from './console';
import { sendMessage, saveUsers, getSessionUsers } from './lib';
import store from './store';

const _users = getSessionUsers();
const users: string[] = _users || [];
const streams: Record<string, MediaStream> = {};

let isRoom = false;
let loadedRoom = false;

export const getSupports = () => util.supports;

export const getPeer = ({
  path,
  port,
  host,
  userId,
  debug,
  secure,
}: {
  userId: string;
  path: string;
  port: number;
  host: string;
  debug?: 0 | 1 | 2 | 3;
  secure?: boolean;
}): Peer => {
  const peer = new Peer(userId, {
    port,
    path,
    host,
    debug,
    secure,
  });
  return peer;
};

export const removeDisconnected = ({ userId }: { userId: string }) => {
  const state = store.getState();
  const { added } = state;
  if (added) {
    const usersL = added.users.filter((item) => item !== userId);
    delete added.streams[userId];
    store.dispatch({
      type: 'added-user',
      added: {
        users: usersL,
        streams: added.streams,
      },
    });
  }
};

export const addVideoStream = ({ stream, id }: { stream: MediaStream; id: string }): void => {
  const state = store.getState();
  const { added } = state;
  if (added) {
    const usersL = added.users.map((item) => item);
    if (added.users.filter((item) => item === id).length === 0 && !/^0/.test(id)) {
      usersL.push(id);
    }
    const _changed: Record<string, { ref: React.LegacyRef<HTMLVideoElement> | undefined }> = {};
    _changed[id] = {
      ref: (node: HTMLVideoElement) => {
        // eslint-disable-next-line no-param-reassign
        if (node) node.srcObject = stream;
      },
    };
    const _streams = { ...added.streams, ..._changed };
    store.dispatch({
      type: 'added-user',
      added: {
        users: usersL,
        streams: _streams,
      },
    });
  } else {
    Console.warn('Added list not found in store');
  }
};

const callToRoom = ({
  stream,
  roomId,
  peer,
}: {
  stream: MediaStream;
  roomId: string;
  peer: Peer;
}) => {
  // If guest that call to room
  const call = peer.call(roomId, stream);
  if (call) {
    call.on('stream', (remoteStream) => {
      // Runing twice anytime
      addVideoStream({
        stream: remoteStream,
        id: roomId,
      });
    });
    // Reconnect to room
    call.on('close', () => {
      if (!isRoom) {
        setTimeout(() => {
          sendMessage({
            type: 'disconnect',
            peer,
            value: [call.peer],
            id: roomId,
          });
        }, 1000);
      } else {
        // TODO room is disconnected
        console.log(87, users);
      }
    });
  } else {
    Console.error('Call is null: 78');
  }
};

export const loadSelfStreamAndCallToRoom = ({
  roomId,
  userId,
  peer,
  shareScreen,
}: {
  roomId: string;
  userId: string;
  peer: Peer;
  shareScreen: boolean;
}) => {
  // Load self stream
  navigator.mediaDevices[shareScreen ? 'getDisplayMedia' : 'getUserMedia']({
    video: true,
  })
    .then((stream) => {
      addVideoStream({
        stream,
        id: userId,
      });
      if (!isRoom) {
        callToRoom({
          stream,
          peer,
          roomId,
        });
      }
    })
    .catch((err) => {
      if (err.name === 'NotAllowedError') {
        // eslint-disable-next-line no-alert
        alert(`Error ${err.name}: ${err.message}`);
      }
      Console.error('Failed to get local stream', err);
    });
};

const removeOneUser = ({ userId }: { userId: string }) => {
  const userIndex = users.indexOf(userId);
  if (userIndex !== -1) {
    users.splice(userIndex, 1);
    saveUsers({ users });
    delete streams[userId];
  }
};

const getUniqueUser = ({ userId, list }: { userId: string; list: string[] }) =>
  list.filter((item) => item === userId).length === 0;

const dropUser = ({ roomId, userId, peer }: { roomId: string; userId: string; peer: Peer }) => {
  removeOneUser({ userId });
  removeDisconnected({
    userId,
  });
  users.forEach((item) => {
    if (item !== roomId) {
      sendMessage({
        type: 'dropuser',
        value: [userId],
        id: item,
        peer,
      });
    }
  });
};

const emptyRoomHandler = ({ peer, roomId }: { peer: Peer; roomId: string }) => {
  if (users.length === 1) {
    setTimeout(() => {
      if (users.length === 0) {
        sendMessage({
          type: 'dropuser',
          id: `dropuser_${roomId}`,
          peer,
          value: [roomId],
        });
      }
    }, 3000);
  }
};

export const loadRoom = async ({
  peer,
  roomId,
  userId,
  shareScreen = false,
}: {
  peer: Peer;
  roomId: string;
  userId: string;
  shareScreen?: boolean;
}): Promise<void> => {
  isRoom = roomId === userId;
  peer.on('open', (id) => {
    if (roomId) {
      setInterval(() => {
        emptyRoomHandler({ peer, roomId });
      }, 2000);
    }
    // Listen incoming call
    peer.on('call', (call) => {
      call.answer(null);
      if (isRoom) {
        call.on('stream', (stream) => {
          // save user stream
          streams[call.peer] = stream;
          addVideoStream({
            stream,
            id: call.peer,
          });
          // pass user stream to other users
          users.forEach((item) => {
            if (item !== roomId && item !== call.peer) {
              peer.call(item, streams[call.peer], { metadata: { id: call.peer } });
            }
          });
          // pass streams from other users to called user
          users.forEach((item) => {
            if (item !== roomId && item !== call.peer) {
              peer.call(call.peer, streams[item], { metadata: { id: item } });
            }
          });
          if (getUniqueUser({ userId: call.peer, list: users }) && call.peer !== roomId) {
            users.push(call.peer);
            saveUsers({ users });
          }
        });
      } else {
        call.on('stream', (remoteStream, connectionId) => {
          // Check if user id but not empty room stream
          if (/^\d{13}$/.test(connectionId)) {
            addVideoStream({
              stream: remoteStream,
              id: connectionId,
            });
          }
        });
      }
    });
    // Listen room connections
    peer.on('connection', (conn) => {
      const guestId = conn.peer;
      // Guest disconnected
      conn.on('close', () => {
        if (isRoom) {
          dropUser({ userId: guestId, roomId, peer });
        }
      });
      conn.on('error', (_id) => {
        console.log(1111, _id);
      });
      conn.on('disconnected', (_id) => {
        dropUser({ userId: guestId, peer, roomId });
        emptyRoomHandler({ roomId, peer });
      });
      const _id = conn.peer;
      // Listen room messages
      conn.on('data', (data) => {
        const { value } = data as { value: string[] };
        switch (data.type) {
          case 'connect':
            sendMessage({
              peer,
              type: 'onconnect',
              value: users,
              id: guestId,
            });
            break;
          case 'onconnect':
            loadSelfStreamAndCallToRoom({
              roomId,
              peer,
              userId,
              shareScreen,
            });
            break;
          case 'disconnect':
            if (users.indexOf(value[0]) !== -1) {
              sendMessage({
                peer,
                type: 'onconnect',
                value: users,
                id: value[0],
              });
            }
            break;
          case 'dropuser':
            if (value[0] !== userId) {
              removeDisconnected({
                userId: value[0],
              });
            }
            break;
          default:
            Console.warn('Unresolved peer message', data);
        }
        Console.info('Event', data);
      });
      Console.info('Event', { type: 'connection', value: conn });
    });
    // TODO refactor destroy
    peer.on('error', (err) => {
      Console.error('Error 322:', err);
    });
    // Connect to room
    if (isRoom) {
      if (!loadedRoom) {
        loadedRoom = true;
        loadSelfStreamAndCallToRoom({ roomId, userId, peer, shareScreen });
      }
    } else {
      /*
      sendMessage({
        type: 'connect',
        peer,
        value: [userId],
        id: roomId,
      }); */
      loadSelfStreamAndCallToRoom({ roomId, userId, peer, shareScreen });
    }
    Console.info('Event', { type: 'open', value: id });
  });
};
