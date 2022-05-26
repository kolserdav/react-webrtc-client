import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Router from './components/Router/Router';

/**
 * Main component of library
 */

const isProd = process.env.NODE_ENV === 'production';

function Main() {
  return (
    <BrowserRouter>
      <Router
        port={parseInt(process.env.REACT_APP_STUN_PORT as string, 10)}
        host={process.env.REACT_APP_STUN_SERVER as string}
        path="/"
        secure={isProd}
        debug={process.env.NODE_ENV === 'production' ? 0 : 2}
      />
    </BrowserRouter>
  );
}

Main.defaultProps = {
  userId: '',
};

export default Main;
