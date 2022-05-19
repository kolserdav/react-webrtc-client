import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Router from './components/Router/Router';
import { REPOSITORY } from './utils';

/**
 * Main component of library
 */

interface MainProps {
  test?: boolean;
}

function Main({ test }: MainProps) {
  return (
    <BrowserRouter>
      <Router port={9000} host="192.168.0.3" path="/" />
    </BrowserRouter>
  );
}

Main.defaultProps = {
  test: false,
};

export default Main;
