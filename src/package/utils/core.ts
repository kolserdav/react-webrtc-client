/* eslint-disable import/no-relative-packages */
import React from 'react';
import { Peer, util } from './peer';
import Console from './console';
import {
  sendMessage,
  addVideoStream,
  removeDisconnected,
  loadSelfStreamAndCallToRoom,
} from './lib';

const users: string[] = [];

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

export const loadRoom = ({
  peer,
  roomId,
  pathname,
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
  pathname: string;
  userId: string;
  width?: number;
  height?: number;
  videoClassName?: string;
  nameClassName: string;
}) => {
  peer.on('open', (id) => {
    // Connect to room
    if (roomId) {
      sendMessage({
        peer,
        id: roomId,
        value: [userId],
        type: 'connect',
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
            });
          });
        })
        .catch((err) => {
          Console.error('Failed to get local stream', err);
          alert(`Error 95 ${JSON.stringify(err)}`);
        });
    });
    // Listen room connections
    peer.on('connection', (conn) => {
      const guestId = conn.peer;
      if (!roomId) {
        if (users.filter((item) => item === guestId).length === 0) {
          users.push(guestId);
        }
      }
      // Guest disconnectted
      conn.on('close', () => {
        removeDisconnected({
          videoContainer,
          userId: guestId,
        });
        users.splice(users.indexOf(guestId), 1);
        // Send to guests for drop disconnected
        users.forEach((item) => {
          sendMessage({
            type: 'dropuser',
            peer,
            value: [guestId],
            id: item,
          });
        });

        Console.info('Event', { type: 'close', value: guestId });
      });
      // Listen room answer
      const _id = conn.peer;
      conn.on('data', (data) => {
        const { value } = data as { value: string[] };
        switch (data.type) {
          case 'connect':
            if (!pathname) {
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
            }
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
                });
              }
            });
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
    });
  });
  peer.on('disconnected', () => {
    /** */
  });
  peer.on('error', (err) => {
    Console.error('Error', err);
  });
};
