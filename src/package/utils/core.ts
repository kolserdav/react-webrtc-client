/* eslint-disable import/no-relative-packages */
import React from 'react';
import { Peer, util } from './peer';
import Console from './console';
import { sendMessage, removeDisconnected, saveUsers, getSessionUsers } from './lib';
import store from './store';

const _users = getSessionUsers();
const users: string[] = _users || [];

let isRoom = false;

export const getSupports = () => util.supports;

const getPeer = ({
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

export const addVideoStream = ({ stream, id }: { stream: MediaStream; id: string }): void => {
  store.dispatch({
    type: 'added',
    added: {
      id,
      stream,
    },
  });
};

const callToRoom = ({
  stream,
  roomId,
  userId,
  peer,
}: {
  stream: MediaStream;
  roomId: string;
  userId: string;
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
      setTimeout(() => {
        sendMessage({
          type: 'connect',
          peer,
          value: [userId],
          id: roomId,
        });
      }, 1000);
    });
  } else {
    Console.error('Call is null: 78');
  }
};

export const loadSelfStreamAndCallToRoom = ({
  roomId,
  userId,
  peer,
}: {
  roomId: string;
  userId: string;
  peer: Peer;
}) => {
  // Load self stream
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then((stream) => {
      addVideoStream({
        stream,
        id: userId,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _peer: any = peer;
      const cons = _peer._connections;
      let check = true;
      for (let i = 0; cons[i]; i++) {
        if (cons[i] === roomId) {
          check = false;
        }
      }
      if (check && roomId !== userId) {
        callToRoom({
          stream,
          peer,
          roomId,
          userId,
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
  }
};

/**
 * Connect with other users
 */
const connectWithAll = ({ list, peer, userId }: { list: string[]; peer: Peer; userId: string }) => {
  list.forEach((item) => {
    if (item !== userId) {
      loadSelfStreamAndCallToRoom({
        roomId: item,
        peer,
        userId,
      });
    }
  });
};

const getUniqueUser = ({ userId, list }: { userId: string; list: string[] }) =>
  list.filter((item) => item === userId).length === 0;

export const loadRoom = async ({
  roomId,
  userId,
  path,
  port,
  host,
  debug,
  secure,
}: {
  roomId: string;
  userId: string;
  path: string;
  port: number;
  host: string;
  debug?: 0 | 1 | 2 | 3;
  secure?: boolean;
}): Promise<1 | 0> => {
  isRoom = roomId === userId;
  const peer = getPeer({ userId, path, port, host, debug, secure });
  return new Promise((resolve) => {
    peer.on('open', (id) => {
      // Listen incoming call
      peer.on('call', (call) => {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: true })
          .then((stream) => {
            call.answer(stream);
            call.on('stream', (remoteStream) => {
              // Runing twice anytime
              addVideoStream({
                stream: remoteStream,
                id: call.peer,
              });
            });
          })
          .catch((err) => {
            if (err.name === 'NotAllowedError') {
              // eslint-disable-next-line no-alert
              alert(`Error ${err.name}: ${err.message}`);
            }
            Console.error('Failed to get local stream', err);
          });
      });
      // Listen room connections
      peer.on('connection', (conn) => {
        const guestId = conn.peer;
        // Guest disconnected
        conn.on('close', (d) => {
          if (users.indexOf(guestId) === -1) {
            removeOneUser({ userId: guestId });
            setTimeout(() => {
              removeDisconnected({
                userId: guestId,
              });
              users.forEach((item) => {
                if (item !== roomId) {
                  sendMessage({
                    type: 'dropuser',
                    value: [guestId],
                    id: item,
                    peer,
                  });
                }
              });
            }, 3000);
          }
        });
        const _id = conn.peer;
        // Listen room messages
        conn.on('data', (data) => {
          const { value } = data as { value: string[] };
          switch (data.type) {
            case 'connect':
              if (getUniqueUser({ userId: _id, list: users })) {
                users.push(_id);
                saveUsers({ users });
              }
              sendMessage({
                peer,
                type: 'onconnect',
                value: users,
                id: guestId,
              });
              break;
            case 'onconnect':
              // Call from new guest to other guests
              connectWithAll({
                peer,
                userId,
                list: value,
              });
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
        resolve(0);
      });
      peer.on('error', (err) => {
        resolve(1);
        Console.error('Error 322:', err);
      });
      // Connect to room
      if (isRoom) {
        if (getUniqueUser({ userId, list: users })) {
          users.push(userId);
          saveUsers({ users });
        }
        loadSelfStreamAndCallToRoom({ roomId, userId, peer });
      } else {
        sendMessage({
          type: 'connect',
          peer,
          value: [userId],
          id: roomId,
        });
      }
    });
  });
};
