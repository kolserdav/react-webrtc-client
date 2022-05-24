/* eslint-disable import/no-relative-packages */
import React from 'react';
import { Peer, util } from './peer';
import Console from './console';
import { sendMessage, removeDisconnected, saveUsers, getSessionUsers } from './lib';
import { RENDER_DELAY } from './constants';
import store from './store';

const _users = getSessionUsers();
let users: string[] = _users || [];

export const getSupports = () => util.supports;

export const getPeer = ({
  path,
  port,
  host,
  id,
  debug,
  secure,
}: {
  id: string;
  path: string;
  port: number;
  host: string;
  debug?: 0 | 1 | 2 | 3;
  secure?: boolean;
}): Peer => {
  const peer = new Peer(id, {
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
  if (roomId !== userId) {
    const call = peer.call(roomId, stream);
    call.on('stream', (remoteStream) => {
      // Runing twice anytime
      addVideoStream({
        stream: remoteStream,
        id: roomId,
      });
    });
    call.on('close', () => {
      console.log(1);
      removeDisconnected({
        userId: roomId,
      });
    });
  } else if (users.length) {
    // If room
    users.forEach((item) => {
      if (userId !== item && item !== roomId) {
        setTimeout(() => {
          const call = peer.call(item, stream);
          call.on('stream', (remoteStream) => {
            // Runing twice anytime
            addVideoStream({
              stream: remoteStream,
              id: item,
            });
          });
          call.on('close', () => {
            if (roomId === userId && item !== userId) {
              sendMessage({
                type: 'dropuser',
                peer,
                value: [item],
                id: item,
              });
            }
            removeDisconnected({
              userId: item,
            });
            console.log(2);
          });
        }, RENDER_DELAY);
      }
    });
  }
};

export const changeDimensions = ({
  videoContainer,
  width,
}: {
  videoContainer: React.RefObject<HTMLDivElement>;
  width: number;
}): void => {
  setTimeout(() => {
    const { current } = videoContainer;
    if (current) {
      const { children } = current;
      for (let i = 0; children[i]; i++) {
        const child = children[i];
        const { firstElementChild }: any = child;
        if (firstElementChild) {
          const { videoWidth, videoHeight } =
            firstElementChild.getBoundingClientRect() as HTMLVideoElement;
          const _width = width.toString();
          if (videoWidth > videoHeight && firstElementChild.getAttribute('width') !== _width) {
            const coeff = videoWidth / videoHeight;
            firstElementChild.setAttribute('width', Math.ceil(videoWidth * coeff).toString());
            firstElementChild.setAttribute('height', _width);
          } else if (firstElementChild.getAttribute('heigth') !== _width) {
            const coeff = videoHeight / videoWidth;
            firstElementChild.setAttribute('height', Math.ceil(videoHeight * coeff).toString());
            firstElementChild.setAttribute('width', _width);
          }
        }
      }
    } else {
      // eslint-disable-next-line no-console
      console.warn('Video container is missing');
    }
  }, 0);
};

export const loadSelfStreamAndCallToRoom = ({
  id,
  roomId,
  userId,
  peer,
}: {
  id: string;
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
        id,
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
      if (check) {
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
  users.splice(users.indexOf(userId), 1);
  saveUsers({ users });
};

const connectWithAll = ({ list, peer, userId }: { list: string[]; peer: Peer; userId: string }) => {
  list.forEach((item) => {
    loadSelfStreamAndCallToRoom({
      id: userId,
      roomId: item,
      peer,
      userId,
    });
  });
};

const getUniqueUser = ({ userId }: { userId: string }) =>
  users.filter((item) => item === userId).length === 0;

export const loadRoom = ({
  peer,
  roomId,
  userId,
}: {
  peer: Peer;
  roomId: string;
  userId: string;
}) => {
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
          call.on('disconnect', () => {
            if (roomId === userId) {
              users.forEach((item) => {
                if (call.peer !== item) {
                  sendMessage({
                    type: 'dropuser',
                    peer,
                    value: [call.peer],
                    id: item,
                  });
                  removeDisconnected({
                    userId: call.peer,
                  });
                  console.log(4);
                }
              });
            }
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

      if (getUniqueUser({ userId: guestId })) {
        users.push(guestId);
        saveUsers({ users });
      }

      // Guest disconnected
      conn.on('close', () => {
        if (roomId === userId) {
          users.forEach((item) => {
            if (item !== userId) {
              sendMessage({
                type: 'dropuser',
                peer,
                value: [guestId],
                id: item,
              });
              removeDisconnected({
                userId: guestId,
              });
              console.log(5);
            }
          });
        }
      });
      // Listen room answer
      const _id = conn.peer;
      conn.on('data', (data) => {
        const { value } = data as { value: string[] };
        switch (data.type) {
          case 'connect':
            if (getUniqueUser({ userId: roomId })) {
              users.push(roomId);
              saveUsers({ users });
            }
            users.forEach((item) => {
              if (item !== roomId && userId !== item) {
                sendMessage({
                  peer,
                  type: 'onconnect',
                  value: users,
                  id: _id,
                });
              }
            });
            break;
          case 'onconnect':
            // Call from new guest to other guests
            connectWithAll({
              peer,
              userId,
              list: value,
            });
            users = value;
            saveUsers({ users });
            break;
          case 'dropuser':
            users = value;
            if (value[0] !== userId) {
              removeDisconnected({
                userId: value[0],
              });
            }
            console.log(6, value[0]);
            break;
          default:
            Console.warn('Unresolved peer message', data);
        }

        Console.info('Event', data);
      });
      Console.info('Event', { type: 'connection', value: conn });
    });
    // Connect to room
    if (roomId !== userId) {
      users = [];
      sendMessage({
        peer,
        id: roomId,
        value: [userId],
        type: 'connect',
      });
    } else {
      if (getUniqueUser({ userId })) {
        users.push(userId);
        saveUsers({ users });
      }
      if (users.length === 0) {
        loadSelfStreamAndCallToRoom({ id, roomId, userId, peer });
      }
      users.forEach((item) => {
        connectWithAll({ peer, list: users, userId });
      });
    }
  });
  peer.on('error', (err) => {
    Console.error('Error', err);
    users.forEach((item) => {
      if (err.message.indexOf(item)) {
        removeDisconnected({ userId: item });
        users.splice(users.indexOf(item), 1);
        saveUsers({ users });
      }
    });
    Console.error('Error 322:', err);
  });
};
