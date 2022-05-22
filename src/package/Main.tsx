import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Router from './components/Router/Router';

/**
 * Main component of library
 */

interface MainProps {
  test?: boolean;
}

const isProd = process.env.NODE_ENV === 'development';

function Main({ test }: MainProps) {
  return (
    <BrowserRouter>
      <Router
        port={parseInt(process.env.REACT_APP_STUN_PORT as string, 10)}
        host={process.env.REACT_APP_STUN_SERVER as string}
        path="/"
        secure={isProd}
      />
    </BrowserRouter>
  );
}

Main.defaultProps = {
  test: false,
};

export default Main;
