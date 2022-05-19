import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Peer } from 'peerjs';
import { v4 as uuidv4 } from 'uuid';
import { useLocation } from 'react-router-dom';
import s from './Router.module.scss';

interface FullPeer extends Peer {
  _lastServerId?: string;
}

type PeerReducer = React.Reducer<FullPeer | null, 'PEER'>;

interface RouterProps {
  port: number;
  host: string | 'localhost' | '127.0.0.1';
  path: string | '/';
}

const userId = uuidv4();

const getPeer = ({ path, port, host }: { path: string; port: number; host: string }): FullPeer => {
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

  // const peer = useMemo(() => getPeer({ port, host, path }), [port, host, path]);

  const addVideoStream = (video: HTMLVideoElement, stream: MediaProvider) => {
    // eslint-disable-next-line no-param-reassign
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
      video.play();
      videoContainerRef.current?.append(video);
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
    peer,
    id,
    value,
    type,
  }: {
    peer: Peer;
    value: any;
    id: string;
    type: any;
  }) => {
    const connection = peer.connect(id);
    return new Promise((resolve) => {
      connection.on('open', () => {
        connection.send({ type, value });
        resolve(0);
      });
    });
  };

  useEffect(() => {
    const peer = getPeer({ port, host, path });
    peer.on('open', (id) => {
      console.log(id);
      if (pathname) {
        sendMessage({
          peer,
          id: pathname,
          value: userId,
          type: 'connect',
        });
      }
      peer.on('call', () => {
        console.log(22222);
      });
    });
    // Listen connections
    peer.on('connection', (conn) => {
      const connectUserId = conn.peer;
      // Listen messages
      conn.on('data', (data) => {
        if (data.type === 'connect') {
          sendMessage({
            peer,
            type: 'onconnect',
            value: userId,
            id: connectUserId,
          });
        }
        // eslint-disable-next-line no-console
        console.info('Event', data);
      });
      conn.on('open', () => {
        conn.send('hello!');
      });
    });
    peer.on('disconnected', (conn) => {
      console.log(conn, 'disconn');
    });
  }, []);

  return (
    <div className={s.wrapper}>
      <div className={s.container} ref={videoContainerRef} />
    </div>
  );
}

export default Router;
