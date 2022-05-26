import React, { useMemo } from 'react';
import Main from './dist/Main.esm';
import './dist/Main.css';
import './App.scss';
import request from './request';

const createRoom = async () => {
  const res = await request({
    url: `${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://${
      process.env.REACT_APP_STUN_SERVER
    }:${process.env.REACT_APP_STUN_PORT}/room`,
    method: 'POST',
  });
  const { type, value } = res;
  const { roomId, userId } = value;
  if (type === 'room') {
    window.location.href = `${window.location.pathname}${roomId}?userId=${userId}`;
  }
};

function App() {
  const { pathname } = window.location;

  const room = useMemo(() => /\/\d{12}/.test(pathname), [pathname]);

  return (
    <div className="app">
      {room ? (
        <Main />
      ) : (
        <button type="button" onClick={createRoom}>
          Create room
        </button>
      )}
    </div>
  );
}

export default App;
