import { Peer } from './peer';
import { SESSION_STORAGE_USERS } from './constants';

export const getSessionUsers = (): string[] | null => {
  const users = sessionStorage.getItem(SESSION_STORAGE_USERS);
  if (users) {
    return JSON.parse(users);
  }
  return null;
};

export const removeDisconnected = ({
  videoContainer,
  userId,
}: {
  videoContainer: React.RefObject<HTMLDivElement>;
  userId: string;
}) => {
  const { current } = videoContainer;
  if (current) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { children }: any = current;
    for (let i = 0; children[i]; i++) {
      const child: HTMLDivElement = children[i];
      if (child.getAttribute('id') === userId) {
        current.removeChild(child);
      }
    }
  }
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
  return new Promise((resolve) => {
    connection.on('open', () => {
      connection.send({ type, value });
      resolve(0);
    });
  });
};

export const saveUsers = ({ users }: { users: string[] }): void => {
  sessionStorage.setItem(SESSION_STORAGE_USERS, JSON.stringify(users));
};

export const getWidthOfItem = ({
  container,
}: {
  container: HTMLDivElement;
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
