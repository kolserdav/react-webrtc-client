import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Router from './components/Router/Router';
import { isProd, PROD_DEBUG_LEVEL, DEV_DEBUG_LEVEL } from './utils/constants';

/**
 * Main component of library
 */

function Main() {
  return (
    <BrowserRouter>
      <Router
        port={parseInt(process.env.REACT_APP_STUN_PORT as string, 10)}
        host={process.env.REACT_APP_STUN_SERVER as string}
        path="/"
        secure={isProd}
        debug={isProd ? PROD_DEBUG_LEVEL : DEV_DEBUG_LEVEL}
      />
    </BrowserRouter>
  );
}

Main.defaultProps = {
  userId: '',
};

export default Main;
