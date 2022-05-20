/* eslint-disable import/no-relative-packages */
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useLocation } from 'react-router-dom';
import type { DataConnection } from 'peerjs';
import { Peer } from '../../../../peerjs';

import s from './Router.module.scss';

const removeDisconnected = ({
  videoContainer,
  userId,
}: {
  videoContainer: React.RefObject<HTMLDivElement>;
  userId: string;
}) => {
  const { current } = videoContainer;
  if (current) {
    const { children } = current;
    for (let i = 0; children[i]; i++) {
      const child = children[i];
      if (child.getAttribute('id') === userId) {
        current.removeChild(child);
      }
    }
  }
};

const listenIncomingCall = ({
  peer,
  videoContainer,
}: {
  peer: Peer;
  videoContainer: React.RefObject<HTMLDivElement>;
}) => {
  peer.on('call', (call) => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        call.answer(stream);
        call.on('stream', (remoteStream) => {
          addVideoStream({
            stream: remoteStream,
            id: call.peer,
            videoContainer,
          });
        });
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to get local stream', err);
      });
  });
};

const sendMessage = async ({
  peer,
  id,
  value,
  type,
}: {
  peer: Peer;
  value: string;
  id: string;
  type: 'connect' | 'onconnect';
}): Promise<1 | 0> => {
  const connection = peer.connect(id);
  return new Promise((resolve) => {
    connection.on('open', () => {
      connection.send({ type, value });
      resolve(0);
    });
  });
};

const listenRoomAnswer = ({
  conn,
  peer,
  roomId,
}: {
  conn: DataConnection;
  peer: Peer;
  roomId: string;
}) => {
  const id = conn.peer;
  conn.on('data', (data) => {
    // Send answer to guest
    if (data.type === 'connect') {
      sendMessage({
        peer,
        type: 'onconnect',
        value: roomId,
        id,
      });
    }
    // eslint-disable-next-line no-console
    console.info('Event', data);
  });
};

const addVideoStream = ({
  stream,
  id,
  self,
  videoContainer,
}: {
  stream: MediaStream;
  id: string;
  videoContainer: React.RefObject<HTMLDivElement>;
  self?: boolean;
}): void => {
  const video = document.createElement('video');
  const localStream = stream;
  if (self) {
    localStream.getAudioTracks()[0].enabled = false;
  }
  // eslint-disable-next-line no-param-reassign
  video.srcObject = localStream;
  video.setAttribute('id', id);
  video.addEventListener('loadedmetadata', () => {
    video.play();
    if (self) {
      video.setAttribute('style', 'margin: 1rem; box-shadow: 10px 5px 5px purple;');
    } else {
      video.setAttribute('style', 'margin: 1rem;');
    }
    const { current } = videoContainer;
    let match = false;
    if (current) {
      const { children } = current;
      for (let i = 0; children[i]; i++) {
        const child = children[i];
        if (child.getAttribute('id') === id) {
          match = true;
        }
      }
    }
    if (!match) {
      videoContainer.current?.append(video);
    }
  });
};

const loadSelfStreamAndCallToRoom = ({
  videoContainer,
  id,
  pathname,
  peer,
}: {
  videoContainer: React.RefObject<HTMLDivElement>;
  id: string;
  pathname: string;
  peer: Peer;
}) => {
  // Load self stream
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then((stream) => {
      addVideoStream({
        stream,
        id,
        self: true,
        videoContainer,
      });
      // If guest that call to room
      if (pathname) {
        const call = peer.call(pathname, stream);
        call.on('stream', (remoteStream) => {
          addVideoStream({
            stream: remoteStream,
            id: pathname,
            videoContainer,
          });
        });
      }
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to get local stream', err);
    });
};

interface RouterProps {
  port: number;
  host: string | 'localhost' | '127.0.0.1';
  path: string | '/';
}

const getPeer = ({
  path,
  port,
  host,
  id,
}: {
  id: string;
  path: string;
  port: number;
  host: string;
}): Peer => {
  const peer = new Peer(id, {
    port,
    path,
    host,
  });
  return peer;
};

const loadRoom = ({
  peer,
  pathname,
  userId,
  videoContainer,
}: {
  videoContainer: React.RefObject<HTMLDivElement>;
  peer: Peer;
  pathname: string;
  userId: string;
}) => {
  peer.on('open', (id) => {
    // Connect to room
    if (pathname) {
      sendMessage({
        peer,
        id: pathname,
        value: userId,
        type: 'connect',
      });
    }
    listenIncomingCall({ peer, videoContainer });
    peer.on('connection', (conn) => {
      // Other user disconnectted
      conn.on('close', () => {
        const disconnectUserId = conn.peer;
        removeDisconnected({
          videoContainer,
          userId: disconnectUserId,
        });
        // eslint-disable-next-line no-console
        console.info('Event', { type: 'disconnect', value: disconnectUserId });
      });
      listenRoomAnswer({
        conn,
        peer,
        roomId: userId,
      });
    });
    loadSelfStreamAndCallToRoom({ videoContainer, id: userId, pathname, peer });
  });
};

function Router({ port, host, path }: RouterProps) {
  const videoContainer = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const pathname = location.pathname.replace(/^\//, '');

  const userId = useMemo(() => uuidv4(), []);

  /**
   * Create room
   */
  useEffect(() => {
    const peer = getPeer({ port, host, path, id: userId });
    loadRoom({
      peer,
      userId,
      videoContainer,
      pathname,
    });
  }, []);

  const connectLink = `${window.location.origin}/${userId}`;

  return (
    <div className={s.wrapper}>
      <div className={s.container} ref={videoContainer} />
      {!pathname && (
        <a target="_blank" href={connectLink} rel="noreferrer">
          {connectLink}
        </a>
      )}
      <button
        type="button"
        onClick={() => {
          /** */
        }}
      >
        Mute
      </button>
    </div>
  );
}

export default Router;
