import React, { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getPeer,
  loadRoom,
  getSupports,
  DEFAULT_PARAMS,
  SESSION_STORAGE_USER_ID,
  store,
  Video,
  getRefs,
} from '../../utils';
import s from './Router.module.scss';

const sessionUser = sessionStorage.getItem(SESSION_STORAGE_USER_ID);
let _sessionUser = '';

/**
 * TODO
 * controls
 * admin
 */

function Router({
  port,
  host,
  path,
  secure,
  debug,
}: {
  port: number;
  host: string | 'localhost' | '127.0.0.1';
  path: string | '/';
  secure?: boolean;
  debug?: 0 | 1 | 2 | 3;
}) {
  const navigate = useNavigate();
  const _location = useLocation();
  const location = { ..._location };
  location.pathname = location.pathname.replace(/^\//, '');
  const { pathname } = location;

  const [params, setParams] = useState<typeof DEFAULT_PARAMS>(DEFAULT_PARAMS);
  const [streams, setStreams] = useState<Video[]>([]);
  const [started, setStarted] = useState<boolean>(false);

  const userId = useMemo(
    () => (location.search === '' ? pathname || uuidv4() : sessionUser || _sessionUser || uuidv4()),
    []
  );

  if (!sessionUser) {
    sessionStorage.setItem(SESSION_STORAGE_USER_ID, userId);
  }
  if (_sessionUser) {
    _sessionUser = userId;
  }

  useEffect(() => {
    if (pathname === '') {
      navigate(userId);
    }
  }, [navigate, pathname, userId]);

  useEffect(() => {
    const clearSubs = store.subscribe(() => {
      if (started) {
        setStarted(false);
      }
      const { type, added, deleted } = store.getState();
      if (type === 'added' && added) {
        if (streams.filter((item) => item.id === added.id).length === 0) {
          const _streams = streams.map((item) => item);
          _streams.push(added);
          setStreams(_streams);
        }
      } else if (type === 'deleted' && deleted) {
        const _streams = streams.filter((item) => item.id !== deleted);
        setStreams(_streams);
      }
    });
    return () => {
      clearSubs();
    };
  }, [streams]);

  /**
   * Check supports
   */
  useEffect(() => {
    setParams({
      width: 200,
      height: 300,
    });
    setStarted(true);
    const supports = getSupports();
    if (!supports.webRTC) {
      // eslint-disable-next-line no-alert
      alert(`Not supported browser ${JSON.stringify(supports)}`);
    }
  }, []);

  /**
   * Create room
   */
  useEffect(() => {
    if (started) {
      // Once get peer instance
      const peer = getPeer({
        port,
        host,
        path,
        id: userId,
        debug,
        secure,
      });
      // Starting room after page load
      loadRoom({
        peer,
        userId,
        roomId: pathname,
      });
    }
  }, [port, host, path, userId, pathname, started, debug, params, secure]);

  const connectLink = `${window.location.origin}/${userId}?guest=1`;

  const _streams = useMemo(() => getRefs(streams), [streams]);

  return (
    <div className={s.wrapper}>
      <div className={s.container}>
        {_streams.map((item) => (
          <video
            key={item.id}
            width={params.width}
            height={params.height}
            ref={item.ref}
            id={item.id}
            title={item.id}
            autoPlay
          />
        ))}
      </div>
      <div className={s.actions}>
        <a className={s.room__link} target="_blank" href={connectLink} rel="noreferrer">
          {connectLink}
        </a>
      </div>
    </div>
  );
}

Router.defaultProps = {
  secure: false,
  debug: 0,
};

export default Router;
