import { Peer } from './peer';
import Console from './console';
import s from '../Main.module.scss';
import { SESSION_STORAGE_USERS } from './constants';

export const removeDisconnected = ({
  videoContainer,
  userId,
}: {
  videoContainer: React.RefObject<HTMLDivElement>;
  userId: string;
}) => {
  const { current } = videoContainer;
  if (current) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { children }: any = current;
    for (let i = 0; children[i]; i++) {
      const child: HTMLDivElement = children[i];
      if (child.getAttribute('id') === userId) {
        current.removeChild(child);
      }
    }
  }
};

export const sendMessage = async ({
  peer,
  id,
  value,
  type,
}: {
  peer: Peer;
  value: string[];
  id: string;
  type: 'connect' | 'onconnect' | 'dropuser';
}): Promise<1 | 0> => {
  const connection = peer.connect(id);
  return new Promise((resolve) => {
    connection.on('open', () => {
      connection.send({ type, value });
      resolve(0);
    });
  });
};

export const addVideoStream = ({
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
    video.setAttribute('width', width.toString());
  }
  if (height) {
    video.setAttribute('height', height.toString());
  }
  video.addEventListener('loadedmetadata', () => {
    const div = document.createElement('div');
    div.setAttribute('id', id);
    if (self) {
      div.classList.add(s.call__self__video);
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
      // Once run guarantee
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
      Console.info('Event', { type: 'loadedmetadata', value: id });
    }
  });
};

export const saveUsers = (users: string[]): void => {
  sessionStorage.setItem(SESSION_STORAGE_USERS, JSON.stringify(users));
};

const callToRoom = ({
  stream,
  videoContainer,
  roomId,
  userId,
  peer,
  users,
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
  users: string[];
  width?: number;
  height?: number;
  videoClassName?: string;
  nameClassName: string;
}) => {
  // If guest that call to room
  if (roomId !== userId) {
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
      });
    });
  } else if (users.length) {
    users.forEach((item) => {
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
        });
      });
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
  users,
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
  users: string[];
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
        width,
        roomId,
        userId,
        height,
        videoClassName,
        nameClassName,
        users,
      });
      Console.info('Event', { type: 'loadvideo', value: stream });
    })
    .catch((err) => {
      Console.error('Failed to get local stream', err);
      // TODO NotAllowedError
      // eslint-disable-next-line no-alert
      alert(`Error 203: ${err.message}`);
    });
};
