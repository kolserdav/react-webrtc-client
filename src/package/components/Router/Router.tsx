import React, { useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useLocation } from 'react-router-dom';
import { getPeer, loadRoom, getSupports } from '../../utils';

import s from './Router.module.scss';

interface RouterProps {
  port: number;
  host: string | 'localhost' | '127.0.0.1';
  path: string | '/';
  secure?: boolean;
}

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
}: {
  port: number;
  host: string | 'localhost' | '127.0.0.1';
  path: string | '/';
  secure?: boolean;
}) {
  const videoContainer = useRef<HTMLDivElement>(null);
  const videoContainerSelf = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const pathname = location.pathname.replace(/^\//, '');

  const userId = useMemo(() => uuidv4(), []);

  /**
   * Create room
   */
  useEffect(() => {
    // Check supports
    const supports = getSupports();
    if (!supports.webRTC) {
      // eslint-disable-next-line no-alert
      alert(`Not supported browser ${JSON.stringify(supports)}`);
      return;
    }
    // Once get peer instance
    const peer = getPeer({
      port,
      host,
      path,
      id: userId,
      debug: process.env.NODE_ENV === 'production' ? 0 : 3,
      secure,
    });
    // Starting room after page load
    loadRoom({
      peer,
      userId,
      videoContainer,
      videoContainerSelf,
      roomId: pathname,
      pathname,
      width: 400,
      height: 300,
      videoClassName: s.video,
      nameClassName: s.video__name,
    });
  }, [port, host, path, userId, pathname]);

  const connectLink = `${window.location.origin}/${userId}`;

  return (
    <div className={s.wrapper}>
      {!pathname && (
        <a target="_blank" href={connectLink} rel="noreferrer">
          {connectLink}
        </a>
      )}
      <div className={s.container} ref={videoContainer} />
      <div className={s.container} ref={videoContainerSelf} />
    </div>
  );
}

Router.defaultProps = {
  secure: false,
};

export default Router;
