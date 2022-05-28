import React, { useCallback, useEffect, useState } from 'react';
import { store, getWidthOfItem } from '../../utils';
import s from './Router.module.scss';
import c from '../CloseButton/CloseButton.module.scss';

export function useUsers() {
  const [users, setUsers] = useState<string[]>([]);
  const [streams, setStreams] = useState<
    Record<string, { ref: React.LegacyRef<HTMLVideoElement> | undefined }>
  >({});
  useEffect(() => {
    const { added } = store.getState();
    if (added) {
      setUsers(added.users);
      setStreams(added.streams);
    }
    const clearSubs = store.subscribe(() => {
      const { type, added: _added } = store.getState();
      // TODO fixed reload guest
      if (type === 'added-user' && _added) {
        setUsers(_added.users);
        setStreams(_added.streams);
      }
    });
    return () => {
      clearSubs();
    };
  }, [users]);

  return { users, streams };
}

export const useVideoDimensions = ({
  length,
  container,
}: {
  length: number;
  container: HTMLDivElement | null;
}) => {
  let time = 0;
  return useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      time++;
      if (time % 5 === 0) {
        requestAnimationFrame(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { target }: { target: HTMLVideoElement } = e as any;
          const _container =
            target.getAttribute('data') !== 'full'
              ? container
              : (target.parentElement as HTMLDivElement);
          if (_container) {
            const { videoHeight, videoWidth } = target;
            const { width, cols, rows } = getWidthOfItem({
              length,
              container: _container,
              coeff: videoWidth / videoHeight,
            });
            const coeff = videoWidth / videoHeight;
            if (videoHeight < videoWidth) {
              target.setAttribute('width', width.toString());
              target.setAttribute('height', (width / coeff).toString());
            } else {
              target.setAttribute('width', (width * coeff).toString());
              target.setAttribute('height', width.toString());
            }
            target.parentElement?.parentElement?.setAttribute(
              'style',
              `grid-template-columns: repeat(${cols}, auto);
              grid-template-rows: repeat(${rows}, auto);`
            );
          }
        });
      }
    },
    [length]
  );
};

export const useOnClickVideo = () => (e: React.MouseEvent<HTMLVideoElement, MouseEvent>) => {
  const { target }: { target: HTMLVideoElement } = e as any;
  const { videoWidth, videoHeight } = target;
  const { outerWidth } = window;
  const coeff = videoWidth / videoHeight;
  const height = outerWidth / coeff;
  target.parentElement?.classList.add(s.video__fixed);
  target.parentElement?.firstElementChild?.classList.add(c.open);
  target.setAttribute('data', 'full');
  target.setAttribute('width', outerWidth.toString());
  target.setAttribute('height', height.toString());
};

export const useOnclickClose =
  ({ length, container }: { length: number; container: HTMLDivElement | null }) =>
  (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (container) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { target }: any = e;
      const { nodeName } = target;
      const button: HTMLButtonElement =
        nodeName === 'path'
          ? target.parentElement?.parentElement
          : nodeName === 'svg'
          ? target.parentElement
          : target;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const video: HTMLVideoElement = button.nextElementSibling as any;
      const { videoWidth, videoHeight } = video;
      const { width } = getWidthOfItem({ length, container, coeff: videoWidth / videoHeight });
      const coeff = videoWidth / videoHeight;
      const height = width / coeff;
      video.parentElement?.classList.remove(s.video__fixed);
      button.classList.remove(c.open);
      video.setAttribute('data', '');
      video.setAttribute('width', width.toString());
      video.setAttribute('height', height.toString());
    }
  };

export const usePressEscape = () => (e: React.KeyboardEvent<HTMLDivElement>) => {
  /** TODO */
};
