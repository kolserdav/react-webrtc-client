import React, { useMemo } from 'react';
import Main from './package/Main';
// import './dist/Main.css';
import './App.scss';
import { getRoomId } from './request';

const createRoom = async () => {
  const res = await getRoomId();
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
