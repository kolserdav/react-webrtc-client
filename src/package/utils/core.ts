/* eslint-disable import/no-relative-packages */
import React from 'react';
import { Peer, util } from './peer';
import Console from './console';
import { sendMessage, removeDisconnected, saveUsers } from './lib';
import { SESSION_STORAGE_USERS, RENDER_DELAY } from './constants';

import s from '../Main.module.scss';

const _users = sessionStorage.getItem(SESSION_STORAGE_USERS);
let users: string[] = _users ? JSON.parse(_users) : [];

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

const renderVideo = ({
  video,
  id,
  self,
  videoContainer,
  videoClassName,
  nameClassName,
}: {
  video: HTMLVideoElement;
  id: string;
  videoContainer: React.RefObject<HTMLDivElement>;
  self?: boolean;
  videoClassName?: string;
  nameClassName: string;
}): void => {
  const div = document.createElement('div');
  div.setAttribute('id', id);
  div.setAttribute('title', self ? `${id} (Me)` : id);
  if (self) {
    div.classList.add(s.call__self__video);
  }
  const title = document.createElement('p');
  title.innerHTML = id;
  if (nameClassName) {
    title.classList.add(nameClassName);
  }
  if (videoClassName) {
    div.classList.add(videoClassName);
  }
  div.append(title);
  div.append(video);
  videoContainer.current?.append(div);
  video.play();
};

export const addVideoStream = ({
  peer,
  stream,
  id,
  self,
  videoContainer,
  width,
  height,
  videoClassName,
  nameClassName,
}: {
  peer: Peer;
  stream: MediaStream;
  id: string;
  videoContainer: React.RefObject<HTMLDivElement>;
  width?: number;
  height?: number;
  self?: boolean;
  videoClassName?: string;
  nameClassName: string;
}): void => {
  const video = document.createElement('video');
  const localStream = stream;
  if (self) {
    localStream.getAudioTracks()[0].enabled = false;
  }
  // eslint-disable-next-line no-param-reassign
  video.srcObject = localStream;

  if (width) {
    video.setAttribute('width', width.toString());
  }
  if (height) {
    video.setAttribute('height', height.toString());
  }
  video.addEventListener('loadedmetadata', () => {
    const { current } = videoContainer;
    let match = false;
    if (current) {
      const { children } = current;
      for (let i = 0; children[i]; i++) {
        const child = children[i];
        const childId = child.getAttribute('id') || '';
        if (childId === id) {
          match = true;
        }
      }
    }
    if (!match) {
      // Once video guarantee
      renderVideo({
        video,
        videoContainer,
        videoClassName,
        nameClassName,
        self,
        id,
      });
    } else {
      // Old video reload
      removeDisconnected({
        videoContainer,
        userId: id,
      });
      renderVideo({
        video,
        videoContainer,
        videoClassName,
        nameClassName,
        self,
        id,
      });
    }
  });
};

const callToRoom = ({
  stream,
  videoContainer,
  roomId,
  userId,
  peer,
  width,
  height,
  videoClassName,
  nameClassName,
}: {
  stream: MediaStream;
  videoContainer: React.RefObject<HTMLDivElement>;
  roomId: string;
  userId: string;
  peer: Peer;
  width?: number;
  height?: number;
  videoClassName?: string;
  nameClassName: string;
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
          videoContainer,
          width,
          height,
          videoClassName,
          nameClassName,
          peer,
        });
      });
      call.on('close', () => {
        removeDisconnected({
          videoContainer,
          userId: roomId,
        });
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
              videoContainer,
              width,
              height,
              videoClassName,
              nameClassName,
              peer,
            });
          });
          call.on('close', () => {
            dropUser({ videoContainer, userId: item, peer });
          });
        }, RENDER_DELAY);
      }
    });
  }
};

export const loadSelfStreamAndCallToRoom = ({
  videoContainer,
  videoContainerSelf,
  id,
  roomId,
  userId,
  peer,
  width,
  height,
  restart,
  videoClassName,
  nameClassName,
}: {
  videoContainer: React.RefObject<HTMLDivElement>;
  videoContainerSelf: React.RefObject<HTMLDivElement>;
  id: string;
  roomId: string;
  userId: string;
  peer: Peer;
  width?: number;
  height?: number;
  restart?: boolean;
  videoClassName?: string;
  nameClassName: string;
}) => {
  // Load self stream
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then((stream) => {
      if (!restart) {
        addVideoStream({
          stream,
          id,
          self: true,
          videoContainer: videoContainerSelf,
          width,
          height,
          videoClassName,
          nameClassName,
          peer,
        });
      }
      callToRoom({
        stream,
        videoContainer,
        peer,
        width,
        roomId,
        userId,
        height,
        videoClassName,
        nameClassName,
      });
      Console.info('Event', { type: 'loadvideo', value: stream });
    })
    .catch((err) => {
      if (err.name === 'NotAllowedError') {
        // eslint-disable-next-line no-alert
        alert(`Error ${err.name}: ${err.message}`);
      }
      Console.error('Failed to get local stream', err);
    });
};

const dropUser = ({
  videoContainer,
  userId,
  peer,
}: {
  videoContainer: React.RefObject<HTMLDivElement>;
  userId: string;
  peer: Peer;
}) => {
  removeDisconnected({
    videoContainer,
    userId,
  });
  users.splice(users.indexOf(userId), 1);
  saveUsers(users);
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
  videoContainer,
  videoContainerSelf,
  width,
  height,
  videoClassName,
  nameClassName,
}: {
  videoContainer: React.RefObject<HTMLDivElement>;
  videoContainerSelf: React.RefObject<HTMLDivElement>;
  peer: Peer;
  roomId: string;
  userId: string;
  width?: number;
  height?: number;
  videoClassName?: string;
  nameClassName: string;
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
    } else if (users.length !== 0) {
      users.forEach((item) => {
        sendMessage({
          peer,
          id: item,
          value: [userId],
          type: 'connect',
        });
      });
    }
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
              videoContainer,
              width,
              height,
              videoClassName,
              nameClassName,
              peer,
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

      const userIsNew = users.filter((item) => item === guestId).length === 0;
      if (userIsNew) {
        users.push(guestId);
        saveUsers(users);
      }

      // Guest disconnected
      conn.on('close', () => {
        dropUser({ videoContainer, userId: guestId, peer });
        Console.info('Event', { type: 'close', value: guestId });
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
                  videoContainer,
                  id: userId,
                  roomId: item,
                  peer,
                  videoContainerSelf,
                  width,
                  height,
                  videoClassName,
                  nameClassName,
                  restart: true,
                  userId,
                });
              }
            });
            users = value;
            break;
          case 'dropuser':
            removeDisconnected({
              videoContainer,
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
      videoContainer,
      id: userId,
      roomId,
      peer,
      videoContainerSelf,
      width,
      height,
      videoClassName,
      nameClassName,
      userId,
    });
  });
  peer.on('disconnected', () => {
    /** */
  });
  peer.on('error', (err) => {
    Console.error('Error', err);
    users.forEach((item) => {
      if (err.message.indexOf(item)) {
        removeDisconnected({ videoContainer, userId: item });
        users.splice(users.indexOf(item), 1);
        saveUsers(users);
      }
    });
    Console.error('Error 322:', err);
  });
};
