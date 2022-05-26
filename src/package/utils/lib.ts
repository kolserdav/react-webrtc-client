import { Peer } from './peer';
import { SESSION_STORAGE_USERS } from './constants';
import store from './store';

export interface Video {
  stream: MediaStream;
  id: string;
}

interface VideoSource extends Video {
  ref: React.Ref<HTMLVideoElement>;
}

export const getRefs = (_streams: Record<string, MediaStream>[]): VideoSource[] => {
  let sources = [];
  for (let i = 0; _streams[i]; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item: any = _streams[i];
    const _item: VideoSource = { ...item };
    _item.ref = (node: HTMLVideoElement) => {
      // eslint-disable-next-line no-param-reassign
      if (node) node.srcObject = item.stream;
    };
    sources.push(_item);
  }
  sources = sources.filter((item) => !/^0/.test(item.id));
  return sources.sort((a, b) => {
    if (parseInt(a.id, 10) < parseInt(b.id, 10)) {
      return -1;
    }
    return 1;
  });
};

export const getSessionUsers = (): string[] | null => {
  const users = sessionStorage.getItem(SESSION_STORAGE_USERS);
  if (users) {
    return JSON.parse(users);
  }
  return null;
};

export const removeDisconnected = ({ userId }: { userId: string }) => {
  store.dispatch({
    type: 'deleted',
    deleted: userId,
  });
};

export const sendMessage = async ({
  peer,
  id,
  value,
  type,
}: {
  peer: Peer;
  value: string[];
  id: string;
  type: 'connect' | 'onconnect' | 'dropuser';
}): Promise<1 | 0> => {
  const connection = peer.connect(id);
  if (connection) {
    return new Promise((resolve) => {
      connection.on('open', () => {
        connection.send({ type, value });
        resolve(0);
      });
    });
  }
  return 1;
};

export const saveUsers = ({ users }: { users: string[] }): void => {
  sessionStorage.setItem(SESSION_STORAGE_USERS, JSON.stringify(users));
};

export const getWidthOfItem = ({
  container,
}: {
  container: Element;
}): { width: number; items: number } => {
  const {
    children: { length },
  } = container;
  const { width, height: outerHeight } = container.getBoundingClientRect();
  const height = outerHeight - (outerHeight / 100) * 10;
  let a = 0;
  if (length) {
    const S = width * height;
    const s = Math.ceil(S / length);
    a = Math.sqrt(s);
    // eslint-disable-next-line no-nested-ternary
    a = a > height ? height : a > width ? width : a;
  }
  return {
    width: a,
    items: length,
  };
};
