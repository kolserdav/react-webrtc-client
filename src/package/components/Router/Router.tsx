import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import queryString from 'query-string';
import { loadRoom, getSupports, SESSION_STORAGE_USER_ID } from '../../utils';
import s from './Router.module.scss';
import { useUsers, useVideoDimensions } from './Roouter.hooks';

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
  const container = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const _location = useLocation();
  const location = { ..._location };
  location.pathname = location.pathname.replace(/^\//, '');
  const { pathname, search } = location;
  const { userId } = useMemo(() => queryString.parse(search.replace('?', '')), [search]) as {
    userId: string | undefined;
  };
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

  const { users, streams, width, cols } = useUsers({ container });

  const setVideoDimensions = useVideoDimensions({ width });

  /**
   * Check supports
   */
  useEffect(() => {
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
        loadRoom({
          port,
          host,
          path,
          userId: _userId,
          debug,
          secure,
          roomId: pathname,
        });
      }
    }
  }, [started]);

  const connectLink = `${window.location.origin}/${pathname}`;
  return (
    <div className={s.wrapper}>
      <div
        className={s.container}
        id={cId}
        ref={container}
        style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}
      >
        {users.map((item) => (
          <div key={item} className={s.video}>
            <video
              ref={streams[item]?.ref}
              id={item}
              title={item}
              autoPlay
              onTimeUpdate={setVideoDimensions}
            />
          </div>
        ))}
      </div>
      <div className={s.actions}>
        <a className={s.room__link} target="_blank" href={connectLink} rel="noreferrer">
          {connectLink}
        </a>
        <p className={s.room__link}>{_userId}</p>
      </div>
    </div>
  );
}

Router.defaultProps = {
  secure: false,
  debug: 0,
};

export default Router;
