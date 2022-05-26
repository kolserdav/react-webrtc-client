import React, { useEffect } from 'react';
import Main from './dist/Main.esm';
import './dist/Main.css';
import './App.scss';
import request from './request';

const createRoom = async () => {
  const { pathname } = window.location;
  const res = await request({
    url: `${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://${
      process.env.REACT_APP_STUN_SERVER
    }:${process.env.REACT_APP_STUN_PORT}/room`,
    method: 'POST',
  });
  const { type, value } = res;
  if (type === 'room') {
    window.location.pathname = `${window.location.pathname}${value}`;
  }
};

function App() {
  const { pathname } = window.location;
  useEffect(() => {
    console.log(pathname);
  }, []);
  return (
    <div className="app">
      {/\/\d{12}/.test(pathname) ? (
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
