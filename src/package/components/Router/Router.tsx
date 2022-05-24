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
  changeDimensions,
  getWidthOfItem,
} from '../../utils';

import s from './Router.module.scss';

const sessionUser = sessionStorage.getItem(SESSION_STORAGE_USER_ID);
let _items = -1;
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
  const videoContainer = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const _location = useLocation();
  const location = { ..._location };
  location.pathname = location.pathname.replace(/^\//, '');
  const { pathname } = location;

  const [params, setParams] = useState<typeof DEFAULT_PARAMS>(DEFAULT_PARAMS);
  const [cols, setCols] = useState<number>(2);
  const [users, setUsers] = useState<string[]>([]);
  const [changeDims, setChangeDims] = useState<boolean>(false);

  const userId = useMemo(
    () => (location.search === '' ? pathname || uuidv4() : sessionUser || _sessionUser || uuidv4()),
    [params]
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
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const { current } = videoContainer;
      if (current) {
        const { width, items } = getWidthOfItem({ container: current });
        console.log(_items, items);
        if (items !== _items) {
          setParams({
            width,
            height: width,
            updated: 1,
          });
          _items = items;
        }
        changeDimensions({ videoContainer, width });
      }
    }, 1000);
    return () => {
      clearInterval(interval);
    };
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
    console.log(params);
    if (params.updated == 0) {
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
        roomId: pathname,
        width: params.width,
        height: params.height,
        videoClassName: s.video,
      });
    }
    return () => {
      removeDisconnected({ videoContainer, userId });
    };
  }, [port, host, path, userId, pathname, params.updated]);

  const connectLink = `${window.location.origin}/${userId}?guest=1`;

  return (
    <div className={s.wrapper}>
      <div
        className={s.container}
        ref={videoContainer}
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      />
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
