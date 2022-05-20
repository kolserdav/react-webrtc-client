/* eslint-disable import/no-relative-packages */
import type { DataConnection } from 'peerjs';
import { Peer } from '../../../peerjs';
import s from '../Main.module.scss';

const users: string[] = [];

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
  type: 'connect' | 'onconnect' | 'adduser';
}): Promise<1 | 0> => {
  const connection = peer.connect(id);
  return new Promise((resolve) => {
    connection.on('open', () => {
      connection.send({ type, value });
      resolve(0);
    });
  });
};

const addVideoStream = ({
  stream,
  id,
  self,
  videoContainer,
  width,
  height,
  videoClassName,
  nameClassName,
}: {
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
    const _width = self ? width / 2 : width;
    video.setAttribute('width', _width.toString());
  }
  if (height) {
    const _height = self ? height / 2 : height;
    video.setAttribute('heifht', _height.toString());
  }
  video.addEventListener('loadedmetadata', () => {
    const div = document.createElement('div');
    div.setAttribute('id', id);
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
  videoClassName,
  nameClassName,
}: {
  stream: MediaStream;
  videoContainer: React.RefObject<HTMLDivElement>;
  id: string;
  roomId: string;
  peer: Peer;
  width?: number;
  height?: number;
  videoClassName?: string;
  nameClassName: string;
}) => {
  // If guest that call to room
  if (roomId) {
    const call = peer.call(roomId, stream);
    call.on('stream', (remoteStream) => {
      addVideoStream({
        stream: remoteStream,
        id: roomId,
        videoContainer,
        width,
        height,
        videoClassName,
        nameClassName,
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
  videoClassName,
  nameClassName,
}: {
  videoContainer: React.RefObject<HTMLDivElement>;
  videoContainerSelf: React.RefObject<HTMLDivElement>;
  id: string;
  roomId: string;
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
        videoClassName,
        nameClassName,
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
  videoClassName,
  nameClassName,
}: {
  peer: Peer;
  videoContainer: React.RefObject<HTMLDivElement>;
  width?: number;
  height?: number;
  videoClassName?: string;
  nameClassName: string;
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
            videoClassName,
            nameClassName,
          });
        });
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to get local stream', err);
      });
  });
};

const listenRoomAnswer = ({
  conn,
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
  conn: DataConnection;
  peer: Peer;
  roomId: string;
  userId: string;
  videoContainer: React.RefObject<HTMLDivElement>;
  videoContainerSelf: React.RefObject<HTMLDivElement>;
  width?: number;
  height?: number;
  videoClassName?: string;
  nameClassName: string;
}) => {
  const id = conn.peer;
  let difs: string[];
  conn.on('data', (data) => {
    const { value } = data as { value: string[] };
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
        // difs = value.filter((item) => users.filter((_item) => item === _item).length === 0);
        console.log(value);
        value.forEach((item) => {
          console.log(item, roomId);
          if (item !== roomId) {
            console.log('call', userId, 'to', item);
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
      case 'adduser':
        value.forEach((item) => {
          if (item !== userId && item !== roomId) {
            /** */
          }
        });
        break;
      default:
        // eslint-disable-next-line no-console
        console.warn('Unresolved peer message', data);
    }
    // eslint-disable-next-line no-console
    console.info('Event', data);
  });
};

export const loadRoom = ({
  peer,
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
  pathname: string;
  userId: string;
  width?: number;
  height?: number;
  videoClassName?: string;
  nameClassName: string;
}) => {
  peer.on('open', (id) => {
    // Connect to room
    if (pathname) {
      sendMessage({
        peer,
        id: pathname,
        value: [userId],
        type: 'connect',
      });
    }
    listenIncomingCall({ peer, videoContainer, width, height, videoClassName, nameClassName });
    // Listen room connections
    peer.on('connection', (conn) => {
      const guestId = conn.peer;
      if (users.filter((item) => item === guestId).length === 0) {
        users.push(guestId);
      }
      console.log('connec', users, userId, pathname, guestId);
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
        userId,
        videoContainerSelf,
        videoContainer,
        width,
        height,
        videoClassName,
        nameClassName,
      });
    });
    loadSelfStreamAndCallToRoom({
      videoContainer,
      id: userId,
      roomId: pathname || userId,
      peer,
      videoContainerSelf,
      width,
      height,
      videoClassName,
      nameClassName,
    });
  });
};
