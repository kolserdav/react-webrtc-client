import React, { useCallback, useEffect, useState } from 'react';
import { store, getWidthOfItem } from '../../utils';

export function useUsers({ container }: { container: React.RefObject<HTMLDivElement> }) {
  const [users, setUsers] = useState<string[]>([]);
  const [streams, setStreams] = useState<
    Record<string, { ref: React.LegacyRef<HTMLVideoElement> | undefined }>
  >({});
  const [width, setWidth] = useState<number>(200);
  const [cols, setCols] = useState<number>(1);
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
        const dims = getWidthOfItem({ length: _added.users.length, container });
        setCols(dims.cols);
        setWidth(dims.width);
      }
    });
    return () => {
      clearSubs();
    };
  }, [users]);

  return { users, streams, width, cols };
}

export const useVideoDimensions = ({ width }: { width: number }) => {
  let time = 0;

  return useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      time++;
      if (time % 5 === 0) {
        requestAnimationFrame(() => {
          console.log(width);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { target }: { target: HTMLVideoElement } = e as any;
          const { videoHeight, videoWidth } = target;
          const coeff = videoWidth / videoHeight;
          if (videoHeight < videoWidth) {
            target.setAttribute('width', width.toString());
            target.setAttribute('height', (width / coeff).toString());
          } else {
            target.setAttribute('width', (width * coeff).toString());
            target.setAttribute('height', width.toString());
          }
        });
      }
    },
    [width]
  );
};
