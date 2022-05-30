/* eslint-disable @typescript-eslint/no-explicit-any */
import { createStore } from 'redux';
import { Video } from './lib';

type StoreType = 'initial' | 'added-user' | 'deleted';

interface Reducer {
  type: StoreType;
  added?: {
    users: string[];
    streams: Record<string, { ref: React.LegacyRef<HTMLVideoElement> | undefined }>;
  };
  deleted?: string;
}
// Todo think about state
function reducer(
  // eslint-disable-next-line default-param-last
  state: Reducer = { type: 'initial' },
  action: Reducer
) {
  switch (action.type) {
    case 'added-user':
      return action;
    default:
      return state;
  }
}

const store = createStore(reducer, { type: 'initial', added: { users: [], streams: {} } });

export default store;
