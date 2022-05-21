import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Router from './components/Router/Router';

/**
 * Main component of library
 */

interface MainProps {
  test?: boolean;
}

function Main({ test }: MainProps) {
  return (
    <BrowserRouter>
      <Router port={443} host="stun.uyem.ru" path="/" secure />
    </BrowserRouter>
  );
}

Main.defaultProps = {
  test: false,
};

export default Main;
