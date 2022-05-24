/* eslint-disable import/no-relative-packages */
import React from 'react';
import { Peer, util } from './peer';
import Console from './console';
import { sendMessage, removeDisconnected, saveUsers, getSessionUsers } from './lib';
import { RENDER_DELAY } from './constants';
import store from './store';

import s from '../Main.module.scss';

/**
 * TODO rewrite to class
 */

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
  width,
  height,
  videoClassName,
}: {
  stream: MediaStream;
  roomId: string;
  userId: string;
  peer: Peer;
  width?: number;
  height?: number;
  videoClassName?: string;
}) => {
  // If guest that call to room
  if (roomId !== userId) {
    setTimeout(() => {
      const call = peer.call(roomId, stream);
      call.on('stream', (remoteStream) => {
        // Runing twice anytime
        addVideoStream({
          stream: remoteStream,
          id: roomId,
        });
      });
      call.on('close', () => {
        dropUser({ userId: roomId, peer });
      });
    }, RENDER_DELAY);
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
            dropUser({ userId: item, peer });
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
  restart,
}: {
  id: string;
  roomId: string;
  userId: string;
  peer: Peer;
  restart?: boolean;
}) => {
  // Load self stream
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then((stream) => {
      if (!restart) {
        addVideoStream({
          stream,
          id,
        });
      }
      callToRoom({
        stream,
        peer,
        roomId,
        userId,
      });
    })
    .catch((err) => {
      if (err.name === 'NotAllowedError') {
        // eslint-disable-next-line no-alert
        alert(`Error ${err.name}: ${err.message}`);
      }
      Console.error('Failed to get local stream', err);
    });
};

const dropUser = ({ userId, peer }: { userId: string; peer: Peer }) => {
  removeDisconnected({
    userId,
  });
  users.splice(users.indexOf(userId), 1);
  saveUsers({ users });
  // Send to guests for drop disconnected
  users.forEach((item) => {
    sendMessage({
      type: 'dropuser',
      peer,
      value: [userId],
      id: item,
    });
  });
};

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
    // Connect to room
    if (roomId !== userId) {
      sendMessage({
        peer,
        id: roomId,
        value: [userId],
        type: 'connect',
      });
    }
    users.forEach((item) => {
      if (item !== userId && item !== roomId) {
        sendMessage({
          peer,
          id: item,
          value: [userId],
          type: 'connect',
        });
      }
    });
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
            dropUser({ peer, userId: call.peer });
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

      const userIsNew = users.filter((item) => item === guestId).length === 0;
      if (userIsNew) {
        users.push(guestId);
        saveUsers({ users });
      }

      // Guest disconnected
      conn.on('close', () => {
        dropUser({ userId: guestId, peer });
      });
      // Listen room answer
      const _id = conn.peer;
      conn.on('data', (data) => {
        const { value } = data as { value: string[] };
        switch (data.type) {
          case 'connect':
            users.forEach((item) => {
              sendMessage({
                peer,
                type: 'onconnect',
                value: users.map((_item) => {
                  if (_item === _id) {
                    return userId;
                  }
                  return item;
                }),
                id: _id,
              });
            });
            break;
          case 'onconnect':
            // Call from new guest to other guests
            value.forEach((item) => {
              if (item !== userId) {
                loadSelfStreamAndCallToRoom({
                  id: userId,
                  roomId: item,
                  peer,
                  restart: true,
                  userId,
                });
              }
            });
            users = value;
            saveUsers({ users });
            break;
          case 'dropuser':
            removeDisconnected({
              userId: value[0],
            });
            break;
          default:
            Console.warn('Unresolved peer message', data);
        }

        Console.info('Event', data);
      });
      Console.info('Event', { type: 'connection', value: conn });
    });
    loadSelfStreamAndCallToRoom({
      id: userId,
      roomId,
      peer,
      userId,
    });
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
