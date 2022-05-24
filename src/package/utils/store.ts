/* eslint-disable @typescript-eslint/no-explicit-any */
import { createStore } from 'redux';
import { Video } from './lib';

type StoreType = 'initial' | 'added' | 'deleted';

interface Reducer {
  type: StoreType;
  added?: Video;
  deleted?: string;
}
// Todo think about state
function reducer(
  // eslint-disable-next-line default-param-last
  state: Reducer = { type: 'initial' },
  action: Reducer
) {
  switch (action.type) {
    default:
      return action;
  }
}

const store = createStore(reducer);

export default store;
