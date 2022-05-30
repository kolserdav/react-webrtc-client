import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import queryString from 'query-string';
import { loadRoom, getSupports, SESSION_STORAGE_USER_ID, getPeer } from '../../utils';
import s from './Router.module.scss';
import {
  useOnclickClose,
  useOnClickVideo,
  usePressEscape,
  useUsers,
  useVideoDimensions,
} from './Roouter.hooks';
import CloseButton from '../CloseButton/CloseButton';

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

  const isRoom = location.search === '?room=1';

  const [shareScreen, setShareScreen] = useState<boolean>(false);
  const [supported, setSupported] = useState<boolean>(false);
  const [restart, setRestart] = useState<boolean>(false);

  const _userId = useMemo(
    () =>
      isRoom ? pathname : userId || sessionUser || _sessionUser || new Date().getTime().toString(),
    []
  );
  const cId = _userId.replace(/^\d/, '');

  if (!sessionUser) {
    sessionStorage.setItem(SESSION_STORAGE_USER_ID, _userId);
  }
  if (_sessionUser) {
    _sessionUser = _userId;
  }

  const { users, streams } = useUsers();

  const setVideoDimensions = useVideoDimensions({
    container: container.current,
    length: users.length,
  });
  const onClickVideo = useOnClickVideo();
  const onClickClose = useOnclickClose({ container: container.current, length: users.length });
  const onPressEscape = usePressEscape();
  const peer = useMemo(
    () => getPeer({ userId: _userId, path, port, host, debug, secure }),
    [userId, path, port, host, debug, secure, restart]
  );
  console.log(peer);
  useEffect(() => {
    const supports = getSupports();
    if (!supports.webRTC) {
      // eslint-disable-next-line no-alert
      alert(`Not supported browser ${JSON.stringify(supports)}`);
      return;
    }
    setSupported(true);
  }, []);

  /**
   * Create room
   */
  useEffect(() => {
    if (!supported) {
      return;
    }
    if (!peer.open) {
      // Starting room after page load
      loadRoom({
        peer,
        userId: _userId,
        roomId: pathname,
        shareScreen,
      });
    } else {
      // Restarting
      peer.disconnect();
      peer.destroy();
      setRestart(!restart);
    }
  }, [shareScreen, supported]);

  useEffect(() => {
    if (!supported) {
      return;
    }
    loadRoom({
      peer,
      userId: _userId,
      roomId: pathname,
      shareScreen,
    });
  }, [restart]);

  const connectLink = `${window.location.origin}/${pathname}`;
  return (
    <div className={s.wrapper}>
      <div className={s.container} id={cId} ref={container}>
        {users.map((item, index) => (
          <div key={item} className={s.video}>
            <CloseButton onClick={onClickClose} onKeyDown={onPressEscape} tabindex={index} />
            <video
              ref={streams[item]?.ref}
              id={item}
              title={item}
              autoPlay
              onTimeUpdate={setVideoDimensions}
              onClick={onClickVideo}
            />
          </div>
        ))}
      </div>
      <div className={s.actions}>
        <a className={s.room__link} target="_blank" href={connectLink} rel="noreferrer">
          {connectLink}
        </a>
        <p className={s.room__link}>{_userId}</p>
        {!shareScreen ? (
          <button type="button" onClick={() => setShareScreen(true)}>
            Share screen
          </button>
        ) : (
          <button type="button" onClick={() => setShareScreen(false)}>
            Stop share screen
          </button>
        )}
      </div>
    </div>
  );
}

Router.defaultProps = {
  secure: false,
  debug: 0,
};

export default Router;
