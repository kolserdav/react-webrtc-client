import React, { useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getPeer,
  loadRoom,
  getSupports,
  DEFAULT_PARAMS,
  removeDisconnected,
  SESSION_STORAGE_USER_ID,
} from '../../utils';

import s from './Router.module.scss';

const sessionUser = sessionStorage.getItem(SESSION_STORAGE_USER_ID);

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
  const videoContainer = useRef<HTMLDivElement>(null);
  const videoContainerSelf = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const _location = useLocation();
  const location = { ..._location };
  location.pathname = location.pathname.replace(/^\//, '');
  const { pathname } = location;

  const [params, setParams] = useState<typeof DEFAULT_PARAMS>(DEFAULT_PARAMS);

  const userId = useMemo(
    () => (location.search === '' ? pathname || uuidv4() : sessionUser || uuidv4()),
    [params]
  );

  if (!sessionUser) {
    sessionStorage.setItem(SESSION_STORAGE_USER_ID, userId);
  }

  useEffect(() => {
    if (pathname === '') {
      navigate(userId);
    }
  }, []);

  /**
   * Set params
   */
  useEffect(() => {
    const { outerWidth } = window;
    if (outerWidth < DEFAULT_PARAMS.width) {
      setParams({
        width: outerWidth,
        height: outerWidth / 1.33333333333333,
        updated: true,
      });
    } else {
      const _params = { ...DEFAULT_PARAMS };
      _params.updated = true;
      setParams(_params);
    }
  }, []);

  /**
   * Check supports
   */
  useEffect(() => {
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
    if (params.updated) {
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
        videoContainer,
        videoContainerSelf,
        roomId: pathname,
        width: params.width,
        height: params.height,
        videoClassName: s.video,
        onchangeUserList: (users) => {
          console.log(users);
        },
      });
    }
    return () => {
      removeDisconnected({ videoContainer, userId });
    };
  }, [port, host, path, userId, pathname, params]);

  const connectLink = `${window.location.origin}/${userId}?guest=1`;

  return (
    <div className={s.wrapper}>
      <div className={s.container}>
        <div className={s.container__item} ref={videoContainer} />
        <div className={s.container__item} ref={videoContainerSelf} />
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
