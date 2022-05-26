import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import queryString from 'query-string';
import {
  loadRoom,
  getSupports,
  DEFAULT_PARAMS,
  SESSION_STORAGE_USER_ID,
  store,
  Video,
  getRefs,
  getWidthOfItem,
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
  const { pathname, search } = location;
  const { userId } = useMemo(() => queryString.parse(search.replace('?', '')), [search]) as {
    userId: string | undefined;
  };
  const [params, setParams] = useState<typeof DEFAULT_PARAMS>(DEFAULT_PARAMS);
  const [streams, setStreams] = useState<Video[]>([]);
  const [started, setStarted] = useState<boolean>(false);

  const _userId = useMemo(
    () =>
      location.search === '?room=1'
        ? pathname
        : userId || sessionUser || _sessionUser || new Date().getTime().toString(),
    []
  );
  const cId = _userId.replace(/^\d/, '');

  if (!sessionUser) {
    sessionStorage.setItem(SESSION_STORAGE_USER_ID, _userId);
  }
  if (_sessionUser) {
    _sessionUser = _userId;
  }

  useEffect(() => {
    const clearSubs = store.subscribe(() => {
      if (started) {
        setStarted(false);
      }
      const { type, added, deleted } = store.getState();
      let _streams: typeof streams = [];
      if (type === 'added' && added) {
        if (streams.filter((item) => item.id === added.id).length === 0) {
          _streams = streams.map((item) => item);
          _streams.push(added);
          setStreams(_streams);
        }
      } else if (type === 'deleted' && deleted) {
        _streams = streams.filter((item) => item.id !== deleted);
        setStreams(_streams);
      }
      const { width, items } = getWidthOfItem({ container: document.body });
      /*
      setParams({
        width,
        height: width,
      }); */
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
  }, [pathname]);

  /**
   * Create room
   */
  useEffect(() => {
    if (started) {
      const supports = getSupports();
      if (!supports.webRTC) {
        // eslint-disable-next-line no-alert
        alert(`Not supported browser ${JSON.stringify(supports)}`);
      } else {
        // Starting room after page load
        const connect = loadRoom({
          port,
          host,
          path,
          userId: _userId,
          debug,
          secure,
          roomId: pathname,
        });
        connect.then((e) => {
          if (e) {
            navigate('/');
          }
        });
      }
    }
  }, [port, host, path, _userId, pathname, started, debug, secure]);

  const connectLink = `${window.location.origin}/${pathname}`;

  const _streams = useMemo(() => getRefs(streams), [streams]);

  return (
    <div className={s.wrapper}>
      <div className={s.container} id={cId}>
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
