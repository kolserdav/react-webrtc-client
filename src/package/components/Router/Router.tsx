import React, { useEffect, useMemo, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useLocation } from 'react-router-dom';
// eslint-disable-next-line import/no-relative-packages
import { Peer } from '../../../../peerjs/dist/bundler.mjs';
import type { Peer as PeerI } from '../../../../peerjs/dist/types';
import s from './Router.module.scss';

type PeerReducer = React.Reducer<PeerI | null, 'PEER'>;

interface RouterProps {
  port: number;
  host: string | 'localhost' | '127.0.0.1';
  path: string | '/';
}

const userId: string = uuidv4();

const getPeer = ({ path, port, host }: { path: string; port: number; host: string }): PeerI => {
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
  const [peer, setPeer] = useState<PeerI>();

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
  /*
  useEffect(() => {
    if (peer?._lastServerId) {
      const conn3 = peer.connect(pathname);
      if (!conn3) {
        setTimeout(() => {
          setReload(!reload);
        }, 500);
      } else {
        console.log(conn3, conn3);
        conn3.on('open', () => {
          conn3.send('hi!');
        });
        peer.on('connection', (conn) => {
          console.log('connection');
          conn.on('data', (data) => {
            // Will print 'hi!'
            console.log(22223);
          });
          conn.on('open', () => {
            conn.send('hello!');
          });
        });
      }
    } else {
      setTimeout(() => {
        setReload(!reload);
      }, 500);
    }
  }, [peer?._lastServerId, path, peer, reload]); */
  /*
  useEffect(() => {
    if (peer) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          const call = peer.call(pathname, stream);
          addVideoStream(document.createElement('video'), stream);
          call.on('stream', (remoteStream) => {
            addVideoStream(document.createElement('video'), remoteStream);
          });
        })
        .catch((err) => {
          console.error('Failed to get local stream', err);
        });
    }
  }, [peer]);

  useEffect(() => {
    if (peer) {
      peer.on('call', () => {
        console.log(22222);
      });
    }
  }, [peer]);
*/

  const sendMessage = async ({
    peer: _peer,
    id,
    value,
    type,
  }: {
    peer: PeerI;
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

  useEffect(() => {
    if (peer) {
      // Listen connections
    }
  }, [peer]);

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
