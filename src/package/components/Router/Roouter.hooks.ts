import React, { useEffect, useState } from 'react';
import { store } from '../../utils';

// eslint-disable-next-line import/prefer-default-export
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
