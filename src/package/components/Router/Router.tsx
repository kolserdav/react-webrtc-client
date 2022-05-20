/* eslint-disable import/no-relative-packages */
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useLocation } from 'react-router-dom';
import { Peer } from '../../../../peerjs';

import s from './Router.module.scss';

type PeerReducer = React.Reducer<Peer | null, 'PEER'>;

interface RouterProps {
  port: number;
  host: string | 'localhost' | '127.0.0.1';
  path: string | '/';
}

const userId: string = uuidv4();

const getPeer = ({ path, port, host }: { path: string; port: number; host: string }): Peer => {
  const peer = new Peer(userId, {
    port,
    path,
    host,
  });
  return peer;
};

function Router({ port, host, path }: RouterProps) {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const pathname = location.pathname.replace(/^\//, '');
  const [reload, setReload] = useState<boolean>(false);
  const [users, setUsers] = useState<string[]>([]);
  const [peer, setPeer] = useState<Peer>();

  // const peer = useMemo(() => getPeer({ port, host, path }), [port, host, path]);

  const addVideoStream = ({
    stream,
    id,
    self,
  }: {
    stream: MediaProvider;
    id: string;
    self?: boolean;
  }) => {
    const video = document.createElement('video');
    // eslint-disable-next-line no-param-reassign
    video.srcObject = stream;
    video.setAttribute('id', id);
    video.addEventListener('loadedmetadata', () => {
      video.play();
      if (self) {
        video.setAttribute('style', 'margin: 1rem; box-shadow: 10px 5px 5px purple;');
      } else {
        video.setAttribute('style', 'margin: 1rem;');
      }
      const { current } = videoContainerRef;
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
        videoContainerRef.current?.append(video);
      }
    });
  };

  const sendMessage = async ({
    peer: _peer,
    id,
    value,
    type,
  }: {
    peer: Peer;
    value: any;
    id: string;
    type: any;
  }): Promise<1 | 0> => {
    const connection = _peer.connect(id);
    return new Promise((resolve) => {
      connection.on('open', () => {
        connection.send({ type, value });
        resolve(0);
      });
    });
  };

  useEffect(() => {
    const _peer = getPeer({ port, host, path });
    setPeer(_peer);
    _peer.on('open', (id) => {
      if (pathname) {
        sendMessage({
          peer: _peer,
          id: pathname,
          value: userId,
          type: 'connect',
        });
      }
      _peer.on('call', (call) => {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: true })
          .then((stream) => {
            call.answer(stream);
            call.on('stream', (remoteStream) => {
              addVideoStream({
                stream: remoteStream,
                id: call.peer,
              });
            });
          })
          .catch((err) => {
            console.error('Failed to get local stream', err);
          });
      });
      _peer.on('connection', (conn) => {
        const connectUserId = conn.peer;
        if (users.indexOf(connectUserId) === -1) {
          const _users = users.map((item) => item);
          _users.push(connectUserId);
          setUsers(_users);
        }
        // Other user disconnectted
        conn.on('close', () => {
          const _users = users.filter((item) => item !== connectUserId);
          setUsers(_users);
          const { current } = videoContainerRef;
          if (current) {
            const { children } = current;
            for (let i = 0; children[i]; i++) {
              const child = children[i];
              if (child.getAttribute('id') === connectUserId) {
                current.removeChild(child);
              }
            }
          }
        });
        // Listen messages
        conn.on('data', (data) => {
          if (data.type === 'connect') {
            sendMessage({
              peer: _peer,
              type: 'onconnect',
              value: userId,
              id: connectUserId,
            });
          }
          // eslint-disable-next-line no-console
          console.info('Event', data);
        });
      });
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          // Self video
          addVideoStream({
            stream,
            id: userId,
            self: true,
          });
          if (pathname) {
            const call = _peer.call(pathname, stream);
            call.on('stream', (remoteStream) => {
              addVideoStream({
                stream: remoteStream,
                id: pathname,
              });
            });
          }
        })
        .catch((err) => {
          console.error('Failed to get local stream', err);
        });
    });
    return () => {
      _peer.off('call');
      _peer.off('connection');
    };
  }, []);

  const connectLink = `${window.location.origin}/${userId}`;

  return (
    <div className={s.wrapper}>
      <div className={s.container} ref={videoContainerRef} />
      <div className={s.users}>
        {users.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
      {!pathname && (
        <a target="_blank" href={connectLink} rel="noreferrer">
          {connectLink}
        </a>
      )}
    </div>
  );
}

export default Router;
