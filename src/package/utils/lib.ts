/* eslint-disable import/no-relative-packages */
import type { DataConnection } from 'peerjs';
import { Peer } from '../../../peerjs';

let users: string[] = [];

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

const sendMessage = async ({
  peer,
  id,
  value,
  type,
}: {
  peer: Peer;
  value: string[];
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
  videoContainer: React.RefObject<HTMLDivElement>;
  width?: number;
  height?: number;
}) => {
  const id = conn.peer;
  conn.on('data', (data) => {
    switch (data.type) {
      case 'connect':
        users.forEach((item) => {
          sendMessage({
            peer,
            type: 'onconnect',
            value: users.map((_item) => {
              if (_item === id) {
                return roomId;
              }
              return item;
            }),
            id: item,
          });
        });
        break;
      case 'onconnect':
        users = data.value;
        break;
      default:
        // eslint-disable-next-line no-console
        console.warn('Unresolved peer message', data);
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
  width,
  height,
}: {
  stream: MediaStream;
  id: string;
  videoContainer: React.RefObject<HTMLDivElement>;
  width?: number;
  height?: number;
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
  if (width) {
    video.setAttribute('width', width.toString());
  }
  if (height) {
    video.setAttribute('heifht', height.toString());
  }
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

const callToRoom = ({
  stream,
  videoContainer,
  id,
  roomId,
  peer,
  width,
  height,
}: {
  stream: MediaStream;
  videoContainer: React.RefObject<HTMLDivElement>;
  id: string;
  roomId: string;
  peer: Peer;
  width?: number;
  height?: number;
}) => {
  // If guest that call to room
  if (roomId) {
    const call = peer.call(roomId, stream);
    call.on('stream', (remoteStream) => {
      addVideoStream({
        stream: remoteStream,
        id,
        videoContainer,
        width,
        height,
      });
    });
  }
};

const loadSelfStreamAndCallToRoom = ({
  videoContainer,
  videoContainerSelf,
  id,
  roomId,
  peer,
  width,
  height,
  restart,
}: {
  videoContainer: React.RefObject<HTMLDivElement>;
  videoContainerSelf: React.RefObject<HTMLDivElement>;
  id: string;
  roomId: string;
  peer: Peer;
  width?: number;
  height?: number;
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
          self: true,
          videoContainer: videoContainerSelf,
          width,
          height,
        });
      }
      callToRoom({
        stream,
        videoContainer,
        peer,
        id,
        width,
        roomId,
        height,
      });
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to get local stream', err);
    });
};

export const getPeer = ({
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

const listenIncomingCall = ({
  peer,
  videoContainer,
  width,
  height,
}: {
  peer: Peer;
  videoContainer: React.RefObject<HTMLDivElement>;
  width?: number;
  height?: number;
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
            width,
            height,
          });
        });
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to get local stream', err);
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
}: {
  videoContainer: React.RefObject<HTMLDivElement>;
  videoContainerSelf: React.RefObject<HTMLDivElement>;
  peer: Peer;
  roomId: string;
  userId: string;
  width?: number;
  height?: number;
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
    listenIncomingCall({ peer, videoContainer, width, height });
    // Listen room connections
    peer.on('connection', (conn) => {
      const guestId = conn.peer;
      if (users.filter((item) => item === guestId).length === 0) {
        users.push(guestId);
      }
      // Guest disconnectted
      conn.on('close', () => {
        removeDisconnected({
          videoContainer,
          userId: guestId,
        });
        users.splice(users.indexOf(guestId), 1);
        // eslint-disable-next-line no-console
        console.info('Event', { type: 'disconnect', value: guestId });
      });
      listenRoomAnswer({
        conn,
        peer,
        roomId: userId,
        videoContainer,
        width,
        height,
      });
    });
    loadSelfStreamAndCallToRoom({
      videoContainer,
      id: userId,
      roomId,
      peer,
      videoContainerSelf,
      width,
      height,
    });
  });
};
