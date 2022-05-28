import { Peer } from './peer';
import { SESSION_STORAGE_USERS } from './constants';

export interface Video {
  stream: MediaStream;
  id: string;
}

interface VideoSource extends Video {
  ref: React.Ref<HTMLVideoElement>;
}

export const getRefs = (_streams: Record<string, MediaStream>): VideoSource[] => {
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

export const sendMessage = async ({
  peer,
  id,
  value,
  type,
}: {
  peer: Peer;
  value: string[];
  id: string;
  type: 'connect' | 'onconnect' | 'dropuser' | 'disconnect';
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
  length,
  container,
  coeff,
}: {
  length: number;
  container: HTMLDivElement;
  coeff: number;
}) => {
  let a = 0;
  let dims = {
    cols: 1,
    rows: 1,
  };
  const { width, height } = container.getBoundingClientRect();
  if (length) {
    const horizontal = width > height;
    switch (length) {
      case 2:
        dims = horizontal ? { cols: 2, rows: 1 } : { cols: 1, rows: 2 };
        break;
      case 3:
        dims = { cols: 2, rows: 2 };
        break;
      case 4:
        dims = { cols: 2, rows: 2 };
        break;
      case 5:
        dims = horizontal ? { cols: 3, rows: 2 } : { cols: 2, rows: 3 };
        break;
      case 6:
        dims = horizontal ? { cols: 3, rows: 2 } : { cols: 2, rows: 3 };
        break;
      default:
      // TODO other counts
    }
    const w = width / dims.cols;
    const h = height / dims.rows;
    a = coeff > 1 ? w : h;
  }
  return {
    width: Math.ceil(a),
    cols: dims.cols,
    rows: dims.rows,
  };
};
