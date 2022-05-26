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
  const [users, setUsers] = useState<string[]>([]);
  const [streams, setStreams] = useState<
    Record<string, { stream: MediaStream; ref: React.LegacyRef<HTMLVideoElement> | undefined }>
  >({});
  const [started, setStarted] = useState<boolean>(false);
  const [names, setNames] = useState<string[]>(['1', '2']);

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
      const { type, added, deleted, changed } = store.getState();
      let _users: typeof users = [];
      // TODO fixed reload guest
      if (type === 'added-user' && added) {
        console.log('added', added, _users);
        if (users.filter((item) => item === added).length === 0 && !/^0/.test(added)) {
          _users = users.map((item) => item);
          _users.push(added);
          setUsers(_users);
        }
      } else if (type === 'deleted' && deleted) {
        console.log('deleted', deleted, _users);
        _users = users.filter((item) => item !== deleted);
        setUsers(_users);
      } else if (type === 'changed-stream' && changed) {
        const _changed: any = {};
        const keys = Object.keys(changed);
        const key = keys[0];
        _changed[key] = {
          ref: (node: HTMLVideoElement) => {
            // eslint-disable-next-line no-param-reassign
            if (node) node.srcObject = changed[key];
          },
        };
        const _streams = { ...streams, ..._changed };
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
    setTimeout(() => {
      setNames(['3', '4']);
    }, 2000);
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

  return (
    <div className={s.wrapper}>
      <div className={s.container} id={cId}>
        {users.map((item) => (
          <video
            key={item}
            width={params.width}
            height={params.height}
            ref={streams[item]?.ref}
            id={item}
            title={item}
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
