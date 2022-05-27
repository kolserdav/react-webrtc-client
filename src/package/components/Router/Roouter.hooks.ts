import React, { useCallback, useEffect, useState } from 'react';
import { store, getWidthOfItem } from '../../utils';

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
  container: React.RefObject<HTMLDivElement>;
}) => {
  let time = 0;
  return useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      time++;
      if (time % 5 === 0) {
        requestAnimationFrame(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { target }: { target: HTMLVideoElement } = e as any;
          const { width, cols } = getWidthOfItem({ length, container });
          const { videoHeight, videoWidth } = target;
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
            `grid-template-columns: repeat(${cols}, auto)`
          );
        });
      }
    },
    [length]
  );
};
